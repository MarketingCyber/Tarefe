import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { crmGet, CrmError } from "@/lib/dynamics/client";

/**
 * Old CRM → tarefe.de mirror (phase 1 of docs/crm-redesign/04-migration-plan.md). Copies every record of the
 * Tarefe-relevant Dynamics tables into `crm_records`, unchanged (all fields + Persian display texts).
 *
 * Two ways to see what changed, depending on the table:
 *  - change-tracked tables (contact, account, opportunity, incident, lead, task, annotation, systemuser): Dynamics'
 *    own change tracking. The first run reads everything and ends with a "delta link"; each later run asks that
 *    link for changes AND deletions since the previous run.
 *  - all other (custom) tables: records modified since the newest `modifiedon` already copied. Deletions there are
 *    found by `reconcileDeletions` (full id comparison, cheap for these small tables).
 * Work is done in pages with a time budget; an unfinished import resumes from its saved page link next run.
 */

type Table = { name: string; set: string; tracked: boolean; select?: string };

// Tarefe's own tables plus the standard ones it uses. Not mirrored: new_sitesyncer (the old site's outbound queue,
// not business data) and Microsoft's built-in system tables.
export const CRM_TABLES: Table[] = [
  { name: "contact", set: "contacts", tracked: true },
  { name: "account", set: "accounts", tracked: true },
  { name: "opportunity", set: "opportunities", tracked: true },
  { name: "incident", set: "incidents", tracked: true },
  { name: "lead", set: "leads", tracked: true },
  { name: "task", set: "tasks", tracked: true },
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
];

type Page = { value: Record<string, unknown>[]; "@odata.nextLink"?: string; "@odata.deltaLink"?: string };
export type TableResult = { table: string; upserted: number; deleted: number; done: boolean; error?: string };

const idOf = (table: Table, row: Record<string, unknown>) => (row[`${table.name}id`] ?? row.id) as string | undefined;
const isDeletion = (row: Record<string, unknown>) =>
  typeof row["@odata.context"] === "string" && (row["@odata.context"] as string).includes("$deletedEntity");

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
    const data = row as Prisma.InputJsonValue;
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
  let url: string | null = `${table.set}?$select=${table.name}id`;
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
