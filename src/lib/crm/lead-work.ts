import { prisma } from "@/lib/db";
import { notifyStaff, notifyUser } from "@/lib/notifications";
import { conversionRates, scoreLead, type LeadScore } from "@/lib/crm/lead-score";

/**
 * Daily lead work from the old-CRM mirror: the new-lead queue (speed to lead), the call list and the lead reports.
 * «Contacted» = a completed phone call logged on the lead (the call-result button logs one for every call).
 */

const F = "@OData.Community.Display.V1.FormattedValue";
type Data = Record<string, unknown>;
export const SPEED_LIMIT_HOURS = 2; // a new lead should be called within this time
const NEW_STAGE = 100000000; // «ثبت شده»
const NO_ANSWER_STAGE = 100000005; // «هنوز جواب نداده»

export type QueueLead = {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  type: string | null;
  stage: string | null;
  owner: string | null;
  ownerId: string | null;
  createdOn: string | null;
  waitingHours: number;
  attempts: number;
  score: LeadScore;
  group: "new" | "no_answer" | "follow_up";
};

/** Completed phone calls per lead (call attempts), for the given leads. */
async function callCounts(leadIds: string[]): Promise<Map<string, { calls: number; noAnswer: number; first: string | null }>> {
  if (!leadIds.length) return new Map();
  const rows = await prisma.$queryRaw<{ lead: string; calls: bigint; no_answer: bigint; first: string | null }[]>`
    SELECT lower(data->>'_regardingobjectid_value') AS lead, count(*) AS calls,
           count(*) FILTER (WHERE data->>'description' LIKE ${"%نتیجه: جواب نداد%"}) AS no_answer,
           min(coalesce(data->>'actualend', data->>'modifiedon')) AS first
    FROM crm_records
    WHERE entity = 'phonecall' AND "deletedAt" IS NULL AND state = 1 AND lower(data->>'_regardingobjectid_value') = ANY(${leadIds})
    GROUP BY 1`;
  return new Map(rows.map((r) => [r.lead, { calls: Number(r.calls), noAnswer: Number(r.no_answer), first: r.first }]));
}

/** Open leads to work on, best first within each group: never contacted, not answered yet, in follow-up. */
export async function leadQueue(ownerId?: string | null): Promise<QueueLead[]> {
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "lead", deletedAt: null, state: 0, ...(ownerId ? { ownerId } : {}) },
    select: { crmId: true, data: true, ownerId: true },
    take: 500,
  });
  const ids = rows.map((r) => r.crmId.toLowerCase());
  const [calls, rates] = await Promise.all([callCounts(ids), conversionRates()]);
  const now = Date.now();
  const list = rows.map((r) => {
    const d = r.data as Data;
    const id = r.crmId.toLowerCase();
    const c = calls.get(id);
    const stage = typeof d.new_status === "number" ? d.new_status : null;
    const group: QueueLead["group"] = !c && (stage === null || stage === NEW_STAGE) ? "new" : stage === NO_ANSWER_STAGE ? "no_answer" : "follow_up";
    const created = typeof d.createdon === "string" ? Date.parse(d.createdon) : now;
    return {
      id,
      name: String(d.fullname ?? "بدون نام"),
      phone: (d.mobilephone as string) ?? (d.telephone1 as string) ?? null,
      source: (d[`leadsourcecode${F}`] as string) ?? null,
      type: (d[`_new_type_value${F}`] as string) ?? null,
      stage: (d[`new_status${F}`] as string) ?? null,
      owner: (d[`_ownerid_value${F}`] as string) ?? null,
      ownerId: r.ownerId,
      createdOn: (d.createdon as string) ?? null,
      waitingHours: (now - created) / 3_600_000,
      attempts: c?.noAnswer ?? 0,
      score: scoreLead(d, rates, c?.noAnswer ?? 0),
      group,
    };
  });
  const order = { new: 0, no_answer: 1, follow_up: 2 };
  // New ones: longest waiting first (speed to lead); the others: highest score first.
  return list.sort((a, b) => order[a.group] - order[b.group] || (a.group === "new" ? b.waitingHours - a.waitingHours : b.score.score - a.score.score));
}

export type CallItem = { id: string; subject: string; dueAt: Date | null; overdue: boolean; regarding: { entity: string; id: string; name: string } | null; phone: string | null; owner: string | null };

/** Planned (open) phone calls due by the end of today, for one old-CRM user or everyone. */
export async function callList(ownerId: string | null): Promise<CallItem[]> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "phonecall", deletedAt: null, state: 0, dueAt: { lte: endOfToday }, ...(ownerId ? { ownerId } : {}) },
    select: { crmId: true, data: true, dueAt: true },
    orderBy: { dueAt: "asc" },
    take: 300,
  });
  // The phone number: the call's own, else the lead's / customer's.
  const regardingIds = [...new Set(rows.map((r) => String((r.data as Data)._regardingobjectid_value ?? "").toLowerCase()).filter(Boolean))];
  const records = regardingIds.length
    ? await prisma.crmRecord.findMany({
        where: { entity: { in: ["lead", "contact"] }, OR: regardingIds.map((id) => ({ crmId: { equals: id, mode: "insensitive" as const } })) },
        select: { crmId: true, data: true },
      })
    : [];
  const phoneOf = new Map(records.map((r) => [r.crmId.toLowerCase(), ((r.data as Data).mobilephone ?? (r.data as Data).telephone1 ?? null) as string | null]));
  const now = Date.now();
  return rows.map((r) => {
    const d = r.data as Data;
    const rid = String(d._regardingobjectid_value ?? "").toLowerCase();
    const entity = String(d["_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname"] ?? "");
    return {
      id: r.crmId.toLowerCase(),
      subject: String(d.subject ?? "تماس"),
      dueAt: r.dueAt,
      overdue: !!r.dueAt && r.dueAt.getTime() < now,
      regarding: rid ? { entity, id: rid, name: String(d[`_regardingobjectid_value${F}`] ?? "—") } : null,
      phone: (d.phonenumber as string) || phoneOf.get(rid) || null,
      owner: (d[`_ownerid_value${F}`] as string) ?? null,
    };
  });
}

/** Where a call's record opens in /ops. */
export function recordHref(entity: string, id: string) {
  return entity === "lead" ? `/ops/leads/${id}` : entity === "contact" ? `/ops/customers/${id}` : entity === "opportunity" ? `/ops/contracts/${id}` : entity === "incident" ? `/ops/tickets/${id}` : `/ops/old-crm/${entity}/${id}`;
}

export type OperatorRow = { owner: string; leads: number; converted: number; closed: number; open: number; called: number; medianFirstCallHours: number | null; medianDaysToContract: number | null };
export type TypeRow = { type: string; leads: number; converted: number };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Lead reports for leads created since `since`: per operator (owner) and per contract type. */
export async function leadReports(since: string): Promise<{ operators: OperatorRow[]; types: TypeRow[] }> {
  const rows = await prisma.$queryRaw<{ crmId: string; data: Data; state: number | null }[]>`
    SELECT "crmId", data, state FROM crm_records WHERE entity = 'lead' AND "deletedAt" IS NULL AND data->>'createdon' >= ${since}`;
  const ids = rows.map((r) => r.crmId.toLowerCase());
  const calls = await callCounts(ids);
  const contractIds = rows.map((r) => (r.data as Data)._qualifyingopportunityid_value).filter((x): x is string => typeof x === "string");
  const contracts = contractIds.length
    ? await prisma.crmRecord.findMany({
        where: { entity: "opportunity", OR: contractIds.map((id) => ({ crmId: { equals: id, mode: "insensitive" as const } })) },
        select: { crmId: true, data: true },
      })
    : [];
  const contractCreated = new Map(contracts.map((c) => [c.crmId.toLowerCase(), String((c.data as Data).createdon ?? "")]));

  const ops = new Map<string, OperatorRow & { firstCalls: number[]; toContract: number[] }>();
  const types = new Map<string, TypeRow>();
  for (const r of rows) {
    const d = r.data as Data;
    const owner = String(d[`_ownerid_value${F}`] ?? "—");
    const o = ops.get(owner) ?? { owner, leads: 0, converted: 0, closed: 0, open: 0, called: 0, medianFirstCallHours: null, medianDaysToContract: null, firstCalls: [], toContract: [] };
    o.leads++;
    if (r.state === 1) o.converted++;
    else if (r.state === 2) o.closed++;
    else o.open++;
    const created = typeof d.createdon === "string" ? Date.parse(d.createdon) : NaN;
    const c = calls.get(r.crmId.toLowerCase());
    if (c) {
      o.called++;
      if (c.first && !Number.isNaN(created)) o.firstCalls.push(Math.max(0, (Date.parse(c.first) - created) / 3_600_000));
    }
    const contract = typeof d._qualifyingopportunityid_value === "string" ? contractCreated.get(d._qualifyingopportunityid_value.toLowerCase()) : undefined;
    if (contract && !Number.isNaN(created)) o.toContract.push(Math.max(0, (Date.parse(contract) - created) / 86_400_000));
    ops.set(owner, o);

    const type = String(d[`_new_type_value${F}`] ?? "نامشخص");
    const t = types.get(type) ?? { type, leads: 0, converted: 0 };
    t.leads++;
    if (r.state === 1) t.converted++;
    types.set(type, t);
  }
  return {
    operators: [...ops.values()]
      .map(({ firstCalls, toContract, ...o }) => ({ ...o, medianFirstCallHours: median(firstCalls), medianDaysToContract: median(toContract) }))
      .sort((a, b) => b.leads - a.leads),
    types: [...types.values()].sort((a, b) => b.leads - a.leads),
  };
}

let lastAlert = 0;

/**
 * Speed to lead: alerts once per lead when a new lead waits longer than SPEED_LIMIT_HOURS without a call — to the
 * staff member who is its owner in the old CRM (User.crmUserId), else to all CRM staff. Only leads of the last week
 * (older ones are not "new"). Throttled; run from the per-minute CRM sync.
 */
export async function alertWaitingLeads(minIntervalMs = 15 * 60_000): Promise<number | null> {
  if (Date.now() - lastAlert < minIntervalMs) return null;
  lastAlert = Date.now();
  const weekAgo = Date.now() - 7 * 86_400_000;
  const waiting = (await leadQueue()).filter((l) => l.group === "new" && l.waitingHours >= SPEED_LIMIT_HOURS && l.createdOn && Date.parse(l.createdOn) >= weekAgo);
  if (!waiting.length) return 0;
  const staffByCrm = new Map(
    (await prisma.user.findMany({ where: { active: true, crmUserId: { not: null } }, select: { id: true, crmUserId: true } })).map((u) => [u.crmUserId!.toLowerCase(), u.id]),
  );
  let sent = 0;
  for (const l of waiting) {
    const key = `lead-waiting-${l.id}`;
    const already = await prisma.notification.findFirst({ where: { dedupeKey: key }, select: { id: true } });
    if (already) continue;
    const title = `سرنخ منتظر تماس: ${l.name}`;
    const body = `${Math.floor(l.waitingHours).toLocaleString("fa-IR")} ساعت از ثبت گذشته و هنوز تماسی ثبت نشده.`;
    const staffId = l.ownerId ? staffByCrm.get(l.ownerId) : undefined;
    if (staffId) await notifyUser(staffId, "lead_waiting", title, body, key);
    else {
      await notifyStaff(null, "lead_waiting", title, body);
      // Marks it alerted (the all-staff notifications above carry no key of their own).
      const first = await prisma.user.findFirst({ where: { active: true, role: { in: ["ADMIN", "ADVISOR", "LEAD_MANAGER"] } }, select: { id: true } });
      if (first) await prisma.notification.updateMany({ where: { userId: first.id, type: "lead_waiting", title, dedupeKey: null }, data: { dedupeKey: key } });
    }
    sent++;
  }
  return sent;
}
