import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { crmGet, CrmError } from "@/lib/dynamics/client";

/**
 * Old CRM → tarefe.de mirror (phase 1 of docs/crm-redesign/04-migration-plan.md). Copies every record of the
 * Tarefe-relevant Dynamics tables into `crm_records`, unchanged (all fields + Persian display texts).
 *
 * Two ways to see what changed, depending on the table:
 *  - change-tracked tables (contact, account, opportunity, incident, lead, annotation, systemuser): Dynamics'
 *    own change tracking. The first run reads everything and ends with a "delta link"; each later run asks that
 *    link for changes AND deletions since the previous run.
 *  - all other (custom) tables: records modified since the newest `modifiedon` already copied. Deletions there are
 *    found by `reconcileDeletions` (full id comparison, cheap for these small tables).
 * Work is done in pages with a time budget; an unfinished import resumes from its saved page link next run.
 */

type Table = { name: string; set: string; tracked: boolean; select?: string; id?: string };

// Tarefe's own tables plus the standard ones it uses. Not mirrored: new_sitesyncer (the old site's outbound queue,
// not business data) and Microsoft's built-in system tables.
export const CRM_TABLES: Table[] = [
  { name: "contact", set: "contacts", tracked: true },
  { name: "account", set: "accounts", tracked: true },
  { name: "opportunity", set: "opportunities", tracked: true },
  { name: "incident", set: "incidents", tracked: true },
  { name: "lead", set: "leads", tracked: true },
  { name: "systemuser", set: "systemusers", tracked: true },
  // Notes without the file bytes (documentbody, ~0.7 GB in total) — files are copied separately.
  {
    name: "annotation",
    set: "annotations",
    tracked: true,
    select: "annotationid,subject,notetext,filename,filesize,mimetype,isdocument,objecttypecode,_objectid_value,_ownerid_value,_createdby_value,_modifiedby_value,createdon,modifiedon,langid,stepid",
  },
  ...[
    ["new_points", "new_pointses"], ["new_children", "new_childrens"], ["new_customer_business", "new_customer_businesses"],
    ["new_gift_code", "new_gift_codes"], ["new_category", "new_categories"], ["new_contract_company", "new_contract_companies"],
    ["new_tarefe_leters", "new_tarefe_leterses"], ["new_generate_letter", "new_generate_letters"], ["new_receive_letter", "new_receive_letters"],
    ["new_customer_sign", "new_customer_signs"], ["new_message_template", "new_message_templates"], ["new_faq", "new_faqs"],
    ["new_counselor_info", "new_counselor_infos"], ["new_notification", "new_notifications"], ["new_upload_files", "new_upload_fileses"],
    ["new_campaign_customer", "new_campaign_customers"], ["new_finance_record", "new_finance_records"], ["new_sitesetting", "new_sitesettings"],
    ["new_control_task_run", "new_control_task_runs"], ["new_contact_opp_count_saver", "new_contact_opp_count_savers"],
    ["new_representative", "new_representatives"], ["new_itempoursant", "new_itempoursants"], ["new_introducingfeess", "new_introducingfeesses"],
    ["new_opportunityformaklerfertrak", "new_opportunityformaklerfertraks"], ["bs_whatsapp", "bs_whatsapps"], ["bs_whatsappsetting", "bs_whatsappsettings"],
    ["bsnotif_notification", "bsnotif_notifications"], ["bsnotif_notificationsetting", "bsnotif_notificationsettings"], ["bsfulm_fulmakht", "bsfulm_fulmakhts"],
  ].map(([name, set]) => ({ name, set, tracked: false })),
  // Activities (operators' history: tasks, emails, calls, appointments). Their id is `activityid`, and reading them
  // with change tracking is refused for the current CRM login, so they go by modifiedon. Last in the list: their
  // first import (~150k records) only uses what's left of each round's time, after the other tables' changes.
  ...[["task", "tasks"], ["email", "emails"], ["phonecall", "phonecalls"], ["appointment", "appointments"]]
    .map(([name, set]) => ({ name, set, tracked: false, id: "activityid" })),
];

type Page = { value: Record<string, unknown>[]; "@odata.nextLink"?: string; "@odata.deltaLink"?: string };
export type TableResult = { table: string; upserted: number; deleted: number; done: boolean; error?: string };

const idField = (table: Table) => table.id ?? `${table.name}id`;
const idOf = (table: Table, row: Record<string, unknown>) => (row[idField(table)] ?? row.id) as string | undefined;
const isDeletion = (row: Record<string, unknown>) =>
  typeof row["@odata.context"] === "string" && (row["@odata.context"] as string).includes("$deletedEntity");

// Secrets are never copied: the old CRM keeps API keys and tokens (new_sitesetting, bs_whatsappsetting), staff
// logins (systemuser.new_username / new_password) and the old customer site's logins (contact.new_username / new_password) in
// plain text. Any field whose name looks like a secret is dropped too, so a new one in Dynamics can't slip through.
const SECRET_NAME = /(password|secret|token|api_?key)/i;
const SECRET_FIELDS: Record<string, string[]> = { contact: ["new_username"], systemuser: ["new_username"] };
const isSecretField = (table: string, name: string) => SECRET_NAME.test(name) || (SECRET_FIELDS[table] ?? []).includes(name);

/** The record without its secret fields (and their display-text annotations). */
export function withoutSecrets(table: string, row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !isSecretField(table, k.split("@")[0])));
}

/** Removes secret fields from records copied before they were filtered out. Returns the number of records cleaned. */
export async function purgeSecretFields(): Promise<number> {
  const fields = await prisma.crmField.findMany({ select: { entity: true, name: true } });
  const byTable = new Map<string, string[]>();
  for (const f of fields) if (isSecretField(f.entity, f.name)) byTable.set(f.entity, [...(byTable.get(f.entity) ?? []), f.name]);
  for (const [table, names] of Object.entries(SECRET_FIELDS)) byTable.set(table, [...new Set([...(byTable.get(table) ?? []), ...names])]);
  let cleaned = 0;
  for (const [table, names] of byTable) {
    const keys = names.flatMap((n) => [n, `${n}@OData.Community.Display.V1.FormattedValue`]);
    cleaned += await prisma.$executeRaw`
      UPDATE crm_records SET data = data - ${keys}::text[] WHERE entity = ${table} AND data ?| ${keys}::text[]`;
  }
  return cleaned;
}

async function saveRows(table: Table, rows: Record<string, unknown>[]) {
  let upserted = 0, deleted = 0;
  for (const row of rows) {
    const crmId = idOf(table, row);
    if (!crmId) continue;
    if (isDeletion(row)) {
      await prisma.crmRecord.updateMany({ where: { entity: table.name, crmId }, data: { deletedAt: new Date() } });
      deleted++;
      continue;
    }
    const modified = typeof row.modifiedon === "string" ? new Date(row.modifiedon) : null;
    const data = withoutSecrets(table.name, row) as Prisma.InputJsonValue;
    await prisma.crmRecord.upsert({
      where: { entity_crmId: { entity: table.name, crmId } },
      create: { entity: table.name, crmId, data, crmModifiedAt: modified },
      update: { data, crmModifiedAt: modified, deletedAt: null },
    });
    upserted++;
  }
  return { upserted, deleted };
}

/** Syncs one table until it is up to date or the deadline passes. */
export async function syncTable(table: Table, deadline: number): Promise<TableResult> {
  const state = await prisma.crmSyncState.upsert({ where: { entity: table.name }, create: { entity: table.name }, update: {} });
  const result: TableResult = { table: table.name, upserted: 0, deleted: 0, done: false };
  const select = table.select ? `$select=${table.select}` : "";
  try {
    let url: string | null;
    let lastModified = state.lastModified;
    if (state.nextLink) url = state.nextLink;
    else if (table.tracked) url = state.deltaLink ?? `${table.set}${select ? `?${select}` : ""}`;
    else {
      const filter = lastModified ? `$filter=modifiedon ge ${lastModified.toISOString()}&` : "";
      url = `${table.set}?${filter}${select ? `${select}&` : ""}$orderby=modifiedon asc`;
    }

    while (url) {
      if (Date.now() > deadline) {
        await prisma.crmSyncState.update({ where: { entity: table.name }, data: { nextLink: url, lastRunAt: new Date(), lastModified, lastError: null } });
        return result;
      }
      const page: Page = await crmGet<Page>(url, { trackChanges: table.tracked });
      const saved = await saveRows(table, page.value ?? []);
      result.upserted += saved.upserted;
      result.deleted += saved.deleted;
      for (const row of page.value ?? []) {
        if (typeof row.modifiedon === "string") {
          const m = new Date(row.modifiedon);
          if (!lastModified || m > lastModified) lastModified = m;
        }
      }
      if (page["@odata.nextLink"]) {
        url = page["@odata.nextLink"];
        await prisma.crmSyncState.update({ where: { entity: table.name }, data: { nextLink: url, lastModified } });
        continue;
      }
      url = null;
      const records = await prisma.crmRecord.count({ where: { entity: table.name, deletedAt: null } });
      await prisma.crmSyncState.update({
        where: { entity: table.name },
        data: { nextLink: null, deltaLink: page["@odata.deltaLink"] ?? state.deltaLink, lastModified, lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null, records },
      });
    }
    result.done = true;
  } catch (error) {
    const message = error instanceof CrmError ? `${error.status || "network"}: ${error.message}` : String(error);
    result.error = message.slice(0, 500);
    // An expired delta link (Dynamics keeps them for a limited time) means: start that table over.
    const restart = table.tracked && state.deltaLink && error instanceof CrmError && error.status === 400;
    await prisma.crmSyncState.update({
      where: { entity: table.name },
      data: { lastRunAt: new Date(), lastError: result.error, ...(restart ? { deltaLink: null, nextLink: null } : {}) },
    });
  }
  return result;
}

/** One sync round over all tables, within `budgetMs`. Tables that didn't finish continue next round. */
export async function syncAll(budgetMs = 50_000, only?: string[]): Promise<TableResult[]> {
  const deadline = Date.now() + budgetMs;
  const results: TableResult[] = [];
  for (const table of CRM_TABLES) {
    if (only && !only.includes(table.name)) continue;
    if (Date.now() > deadline) break;
    results.push(await syncTable(table, deadline));
  }
  return results;
}

/**
 * Deletion check for tables without change tracking: compares all ids in Dynamics with the mirror and marks the
 * missing ones deleted. Meant for a nightly run.
 */
export async function reconcileDeletions(tableName: string): Promise<number> {
  const table = CRM_TABLES.find((t) => t.name === tableName);
  if (!table || table.tracked) return 0;
  const ids = new Set<string>();
  let url: string | null = `${table.set}?$select=${idField(table)}`;
  while (url) {
    const page: Page = await crmGet<Page>(url);
    for (const row of page.value ?? []) {
      const id = idOf(table, row);
      if (id) ids.add(id);
    }
    url = page["@odata.nextLink"] ?? null;
  }
  const local = await prisma.crmRecord.findMany({ where: { entity: table.name, deletedAt: null }, select: { crmId: true } });
  const gone = local.filter((r) => !ids.has(r.crmId)).map((r) => r.crmId);
  if (gone.length) await prisma.crmRecord.updateMany({ where: { entity: table.name, crmId: { in: gone } }, data: { deletedAt: new Date() } });
  return gone.length;
}

type AttributeMeta = { LogicalName: string; AttributeType: string; IsCustomAttribute: boolean; AttributeOf: string | null; DisplayName?: { UserLocalizedLabel?: { Label?: string } | null } };

/** Copies the field labels of every mirrored table (Dynamics attribute metadata) into crm_fields. */
export async function syncFieldLabels(): Promise<number> {
  let count = 0;
  for (const table of CRM_TABLES) {
    let attrs: AttributeMeta[];
    try {
      attrs = (await crmGet<{ value: AttributeMeta[] }>(`EntityDefinitions(LogicalName='${table.name}')/Attributes?$select=LogicalName,AttributeType,IsCustomAttribute,AttributeOf,DisplayName`)).value;
    } catch {
      continue;
    }
    for (const a of attrs) {
      if (a.AttributeOf || ["Virtual", "EntityName", "ManagedProperty", "CalendarRules"].includes(a.AttributeType)) continue;
      const label = a.DisplayName?.UserLocalizedLabel?.Label?.trim() || a.LogicalName;
      const data = { label, type: a.AttributeType, custom: a.IsCustomAttribute, hidden: label.includes("استفاده نشود") };
      await prisma.crmField.upsert({ where: { entity_name: { entity: table.name, name: a.LogicalName } }, create: { entity: table.name, name: a.LogicalName, ...data }, update: data });
      count++;
    }
  }
  return count;
}

export type FormField = { name: string; label: string; hidden: boolean };
export type FormSection = { label: string; hidden: boolean; fields: FormField[] };
export type FormTab = { label: string; hidden: boolean; sections: FormSection[] };

// Which Dynamics main form operators use per table (others: the first active main form, usually "Information").
const MAIN_FORM: Record<string, string> = { contact: "Contact", account: "Account", opportunity: "Opportunity", incident: "Case", lead: "Lead", task: "Task" };

const xmlText = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const firstLabel = (xml: string) => xmlText(/<labels>\s*<label description="([^"]*)"/.exec(xml)?.[1] ?? "");
const isHidden = (openTag: string) => /\bvisible="false"/.test(openTag);

/** Reads a Dynamics form XML into tabs → sections → fields (subgrids and web resources are skipped). */
export function parseFormXml(xml: string): FormTab[] {
  const tabs: FormTab[] = [];
  for (const tab of xml.matchAll(/(<tab\b[^>]*>)([\s\S]*?)<\/tab>/g)) {
    const sections: FormSection[] = [];
    for (const sec of tab[2].matchAll(/(<section\b[^>]*>)([\s\S]*?)<\/section>/g)) {
      const fields: FormField[] = [];
      for (const cell of sec[2].matchAll(/(<cell\b[^>]*>)([\s\S]*?)<\/cell>/g)) {
        const field = /<control\b[^>]*\bdatafieldname="([^"]+)"/.exec(cell[2])?.[1];
        if (!field) continue;
        fields.push({ name: field, label: firstLabel(cell[2]), hidden: isHidden(cell[1]) });
      }
      if (fields.length) sections.push({ label: firstLabel(sec[2]), hidden: isHidden(sec[1]), fields });
    }
    if (sections.length) tabs.push({ label: firstLabel(tab[2]), hidden: isHidden(tab[1]), sections });
  }
  return tabs;
}

/** Copies the main form layout of every mirrored table into crm_forms. */
export async function syncForms(): Promise<number> {
  let count = 0;
  for (const table of CRM_TABLES) {
    let forms: { name: string; formxml: string }[];
    try {
      forms = (await crmGet<{ value: { name: string; formxml: string }[] }>(`systemforms?$select=name,formxml&$filter=objecttypecode eq '${table.name}' and type eq 2 and formactivationstate eq 1`)).value;
    } catch {
      continue;
    }
    const form = forms.find((f) => f.name === MAIN_FORM[table.name]) ?? forms.find((f) => f.name === "Information") ?? forms[0];
    if (!form) continue;
    const layout = parseFormXml(form.formxml) as unknown as Prisma.InputJsonValue;
    await prisma.crmForm.upsert({ where: { entity: table.name }, create: { entity: table.name, name: form.name, layout }, update: { name: form.name, layout } });
    count++;
  }
  return count;
}

const ZERO_GUID = "00000000-0000-0000-0000-000000000000";

/** Live record count of a table. Aggregates stop at 50,000 records, so bigger ranges are split by creation date. */
async function liveCount(table: Table): Promise<number> {
  const count = async (from?: Date, to?: Date): Promise<number> => {
    const filter = from && to ? `filter(createdon ge ${from.toISOString()} and createdon lt ${to.toISOString()})/` : "";
    try {
      return (await crmGet<{ value: { c: number }[] }>(`${table.set}?$apply=${filter}aggregate($count as c)`)).value[0]?.c ?? 0;
    } catch (error) {
      if (!(error instanceof CrmError && error.status === 400 && error.message.includes("AggregateQueryRecordLimit"))) throw error;
      const start = from ?? new Date("2010-01-01T00:00:00Z"), end = to ?? new Date(Date.now() + 86_400_000);
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      return (await count(start, mid)) + (await count(mid, end));
    }
  };
  return count();
}

/** Fields that differ between the mirror and Dynamics. Display texts (@… annotations) are skipped: same value, other format. */
function differingFields(live: Record<string, unknown>, mirror: Record<string, unknown>): string[] {
  const norm = (k: string, v: unknown) => (v === undefined || (k === "processid" && v === ZERO_GUID) ? null : v);
  return [...new Set([...Object.keys(live), ...Object.keys(mirror)])]
    .filter((k) => !k.includes("@"))
    .filter((k) => JSON.stringify(norm(k, live[k])) !== JSON.stringify(norm(k, mirror[k])));
}

/**
 * Nightly QA of the mirror: per table, Dynamics' record count vs. the mirror's, and `sample` random records compared
 * field by field (records changed in Dynamics since the last sync round are skipped; the next round copies them).
 * Each result is saved in crm_checks and shown in /ops/old-crm.
 */
export async function checkMirror(sample = 20, only?: string[]) {
  const results = [];
  for (const table of CRM_TABLES) {
    if (only && !only.includes(table.name)) continue;
    const mirror = await prisma.crmRecord.count({ where: { entity: table.name, deletedAt: null } });
    let live: number | null = null, sampled = 0, error: string | null = null;
    const details: { crmId: string; fields: string[] }[] = [];
    try {
      live = await liveCount(table);
      const rows = await prisma.$queryRaw<{ crmId: string; data: Record<string, unknown> }[]>`
        SELECT "crmId", data FROM crm_records WHERE entity = ${table.name} AND "deletedAt" IS NULL ORDER BY random() LIMIT ${sample}`;
      for (const row of rows) {
        let current: Record<string, unknown>;
        try {
          current = await crmGet<Record<string, unknown>>(`${table.set}(${row.crmId})${table.select ? `?$select=${table.select}` : ""}`);
        } catch (e) {
          if (e instanceof CrmError && e.status === 404) { sampled++; details.push({ crmId: row.crmId, fields: ["(deleted in Dynamics)"] }); continue; }
          throw e;
        }
        if (current.modifiedon !== row.data.modifiedon) continue;
        sampled++;
        const fields = differingFields(withoutSecrets(table.name, current), row.data);
        if (fields.length) details.push({ crmId: row.crmId, fields });
      }
    } catch (e) {
      error = (e instanceof CrmError ? `${e.status || "network"}: ${e.message}` : String(e)).slice(0, 500);
    }
    const saved = await prisma.crmCheck.create({
      data: { entity: table.name, live, mirror, sampled, mismatched: details.length, details: details.length ? details : undefined, error },
    });
    results.push({ table: table.name, live, mirror, sampled, mismatched: saved.mismatched, error });
  }
  return results;
}
