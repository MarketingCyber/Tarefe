import { prisma } from "@/lib/db";
import { emailKey, isGuid, personKeys, phoneKey } from "@/lib/dynamics/identity";

/**
 * Customer 360 across both CRMs: one person = an old-CRM contact (Dynamics mirror) and/or a tarefe.de account
 * (site + app), matched by e-mail or phone (lib/dynamics/identity.ts). Everything is read in a few indexed lookups
 * on crm_records.refs: the records that point at the contact (contracts, tickets, points, letters, notes, tasks,
 * e-mails, calls …), then the activities and notes filed on those contracts and tickets.
 */

export type CrmRow = { entity: string; crmId: string; data: Record<string, unknown>; crmModifiedAt: Date | null };

const ACTIVITY_TABLES = ["task", "email", "phonecall", "appointment", "annotation"];
const MAX_ROWS = 2000;

const rowsReferencing = (ids: string[], entities?: string[]) =>
  ids.length
    ? (prisma.crmRecord.findMany({
        where: { refs: { hasSome: ids.map((i) => i.toLowerCase()) }, deletedAt: null, ...(entities ? { entity: { in: entities } } : {}) },
        select: { entity: true, crmId: true, data: true, crmModifiedAt: true },
        orderBy: { crmModifiedAt: "desc" },
        take: MAX_ROWS,
      }) as Promise<CrmRow[]>)
    : Promise.resolve([] as CrmRow[]);

/** The tarefe.de account of an old-CRM contact: same e-mail first, else same phone. */
async function accountFor(contact: CrmRow) {
  const keys = personKeys(contact.data);
  const emails = keys.filter((k) => k.startsWith("email:")).map((k) => k.slice(6));
  if (emails.length) {
    const byEmail = await prisma.user.findFirst({ where: { role: "CUSTOMER", OR: emails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })) } });
    if (byEmail) return byEmail;
  }
  const phones = new Set(keys.filter((k) => k.startsWith("tel:")));
  if (!phones.size) return null;
  // Phone numbers are stored as typed; narrow by the last 7 digits, then compare normalised.
  const candidates = await prisma.user.findMany({
    where: { role: "CUSTOMER", OR: [...phones].map((p) => ({ phone: { contains: p.slice(-7) } })) },
    take: 20,
  });
  return candidates.find((u) => phones.has(phoneKey(u.phone) ?? "")) ?? null;
}

/** The old-CRM contact of a tarefe.de account. */
async function contactFor(user: { email: string; phone: string | null }) {
  const keys = [emailKey(user.email), phoneKey(user.phone)].filter((k): k is string => !!k);
  if (!keys.length) return null;
  return (await prisma.crmRecord.findFirst({
    where: { entity: "contact", deletedAt: null, refs: { hasSome: keys } },
    select: { entity: true, crmId: true, data: true, crmModifiedAt: true },
    orderBy: { crmModifiedAt: "desc" },
  })) as CrmRow | null;
}

const ACCOUNT_INCLUDE = {
  contracts: { orderBy: { createdAt: "desc" as const } },
  applications: { orderBy: { createdAt: "desc" as const }, include: { advisor: { select: { name: true } } } },
  documents: { orderBy: { uploadedAt: "desc" as const } },
  serviceRequests: { orderBy: { createdAt: "desc" as const }, include: { advisor: { select: { name: true } } } },
  conversations: { orderBy: { lastMessageAt: "desc" as const }, take: 10 },
  customerTasks: {
    orderBy: [{ status: "asc" as const }, { dueAt: { sort: "asc" as const, nulls: "last" as const } }],
    include: { assignee: { select: { name: true } } },
  },
};

/**
 * Loads one customer by either id: a Dynamics contact GUID or a tarefe.de user id. Returns null if neither exists.
 * `related` holds every old-CRM record about the person, grouped by table.
 */
export async function loadCustomer(id: string) {
  let contact: CrmRow | null = null;
  let account = null;
  if (isGuid(id)) {
    contact = (await prisma.crmRecord.findFirst({
      where: { entity: "contact", crmId: { equals: id, mode: "insensitive" } },
      select: { entity: true, crmId: true, data: true, crmModifiedAt: true },
    })) as CrmRow | null;
    if (!contact) return null;
    const match = await accountFor(contact);
    if (match) account = await prisma.user.findUnique({ where: { id: match.id }, include: ACCOUNT_INCLUDE });
  } else {
    account = await prisma.user.findUnique({ where: { id }, include: ACCOUNT_INCLUDE });
    if (!account || account.role !== "CUSTOMER") return null;
    contact = await contactFor(account);
  }

  const related: Record<string, CrmRow[]> = {};
  if (contact) {
    const direct = (await rowsReferencing([contact.crmId])).filter((r) => r.crmId.toLowerCase() !== contact.crmId.toLowerCase());
    // Activities and notes are often filed on a contract or ticket, not on the person: fetch those too.
    const parents = direct.filter((r) => ["opportunity", "incident", "lead"].includes(r.entity)).map((r) => r.crmId);
    const seen = new Set(direct.map((r) => `${r.entity}:${r.crmId}`));
    const indirect = (await rowsReferencing(parents, ACTIVITY_TABLES)).filter((r) => !seen.has(`${r.entity}:${r.crmId}`));
    for (const r of [...direct, ...indirect]) (related[r.entity] ??= []).push(r);
  }

  return { contact, account, related };
}

export type Customer = NonNullable<Awaited<ReturnType<typeof loadCustomer>>>;
