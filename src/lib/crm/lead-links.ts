import { prisma } from "@/lib/db";
import { emailKey, personKeys, phoneKey } from "@/lib/dynamics/identity";
import { addNote, closeLead, writeMode, WriteRefused } from "@/lib/dynamics/write";

/**
 * Linking two old-CRM leads of the same person («اتصال به سرنخ دیگر»). The duplicate is closed in Dynamics with the
 * reason «جواب نداد-تکراری بود» and an explanation naming the main lead (an already closed duplicate stays as it is);
 * a note on the main lead says what was linked; our LeadLink keeps the pair so both pages show «سرنخ‌های مرتبط».
 * No merge: a Dynamics merge moves records irreversibly and runs its own automations.
 */

const F = "@OData.Community.Display.V1.FormattedValue";
const DUPLICATE_REASON = 5; // «جواب نداد-تکراری بود»
type Data = Record<string, unknown>;

export type LeadSummary = { id: string; name: string; code: string | null; phone: string | null; status: string | null; state: number | null; createdOn: string | null; owner: string | null };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
export function summarize(crmId: string, d: Data, state: number | null): LeadSummary {
  return {
    id: crmId.toLowerCase(),
    name: str(d.fullname) ?? "بدون نام",
    code: str(d.new_leadcode),
    phone: str(d.mobilephone) ?? str(d.telephone1),
    status: str(d[`new_status${F}`]),
    state,
    createdOn: str(d.createdon),
    owner: str(d[`_ownerid_value${F}`]),
  };
}

/** Other leads with this lead's e-mail or phone (possible duplicates), newest first. */
export async function possibleDuplicates(leadId: string, data: Data): Promise<LeadSummary[]> {
  const keys = personKeys(data);
  if (!keys.length) return [];
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "lead", deletedAt: null, refs: { hasSome: keys }, NOT: { crmId: { equals: leadId, mode: "insensitive" } } },
    select: { crmId: true, data: true, state: true },
    take: 20,
  });
  return rows.map((r) => summarize(r.crmId, r.data as Data, r.state)).sort((a, b) => (b.createdOn ?? "").localeCompare(a.createdOn ?? ""));
}

/** Leads by phone, e-mail, lead code («کد سرنخ») or part of the name. */
export async function searchLeads(query: string, excludeId: string): Promise<LeadSummary[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const key = emailKey(q) ?? phoneKey(q);
  const rows = key
    ? await prisma.crmRecord.findMany({ where: { entity: "lead", deletedAt: null, refs: { has: key } }, select: { crmId: true, data: true, state: true }, take: 20 })
    : await prisma.$queryRaw<{ crmId: string; data: Data; state: number | null }[]>`
        SELECT "crmId", data, state FROM crm_records
        WHERE entity = 'lead' AND "deletedAt" IS NULL
          AND (data->>'new_leadcode' = ${q} OR data->>'fullname' ILIKE ${`%${q}%`})
        ORDER BY data->>'createdon' DESC LIMIT 20`;
  return rows.filter((r) => r.crmId.toLowerCase() !== excludeId.toLowerCase()).map((r) => summarize(r.crmId, r.data as Data, r.state));
}

/** The leads linked to this one, either way round. */
export async function linkedLeads(leadId: string): Promise<(LeadSummary & { role: "main" | "duplicate" })[]> {
  const id = leadId.toLowerCase();
  const links = await prisma.leadLink.findMany({ where: { OR: [{ leadId: id }, { mainLeadId: id }] }, orderBy: { createdAt: "asc" } });
  if (!links.length) return [];
  const otherIds = links.map((l) => (l.leadId === id ? l.mainLeadId : l.leadId));
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "lead", OR: otherIds.map((o) => ({ crmId: { equals: o, mode: "insensitive" as const } })) },
    select: { crmId: true, data: true, state: true },
  });
  const byId = new Map(rows.map((r) => [r.crmId.toLowerCase(), summarize(r.crmId, r.data as Data, r.state)]));
  return links.flatMap((l) => {
    const other = l.leadId === id ? l.mainLeadId : l.leadId;
    const s = byId.get(other);
    return s ? [{ ...s, role: l.leadId === id ? ("main" as const) : ("duplicate" as const) }] : [];
  });
}

const label = (s: LeadSummary) => [s.name, s.code && `کد ${s.code}`].filter(Boolean).join("، ");

/** Links `duplicateId` to `mainId`: closes the duplicate (if open) as a duplicate, notes it on the main lead, records the pair. */
export async function linkLeads(duplicateId: string, mainId: string, actor: { id: string; name: string }) {
  const dup = duplicateId.toLowerCase();
  const main = mainId.toLowerCase();
  if (dup === main) throw new WriteRefused("یک سرنخ را نمی‌شود به خودش وصل کرد.");
  if (writeMode() === "off") throw new WriteRefused("نوشتن در CRM قدیم خاموش است.");
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "lead", deletedAt: null, OR: [dup, main].map((x) => ({ crmId: { equals: x, mode: "insensitive" as const } })) },
    select: { crmId: true, data: true, state: true },
  });
  const find = (x: string) => rows.find((r) => r.crmId.toLowerCase() === x);
  const d = find(dup);
  const m = find(main);
  if (!d || !m) throw new WriteRefused("سرنخ در CRM قدیم پیدا نشد.");
  if (await prisma.leadLink.findFirst({ where: { OR: [{ leadId: dup, mainLeadId: main }, { leadId: main, mainLeadId: dup }] } })) throw new WriteRefused("این دو سرنخ قبلاً به هم وصل شده‌اند.");
  const dupS = summarize(d.crmId, d.data as Data, d.state);
  const mainS = summarize(m.crmId, m.data as Data, m.state);

  if (d.state === 0) await closeLead(dup, DUPLICATE_REASON, `تکراری — سرنخ اصلی: ${label(mainS)}`, actor);
  await addNote("lead", main, `سرنخ تکراری «${label(dupS)}» به این سرنخ وصل شد (${actor.name}).`, actor);
  await prisma.leadLink.create({ data: { leadId: dup, mainLeadId: main, createdById: actor.id } });
}
