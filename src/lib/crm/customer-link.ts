import { cache } from "react";
import type { ContractStatus, RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emailKey, isGuid, phoneKey } from "@/lib/dynamics/identity";

/**
 * One customer across the platforms (step 2–3 of the plan in PROJECT-STATUS.md):
 *
 * 1. Link — a website / app account (User) knows which old-CRM customer (Dynamics contact) it is: User.crmContactId.
 *    Set automatically when exactly one contact has the account's e-mail (else exactly one has its phone), or by
 *    staff on the Customer 360 page. Ambiguous matches are left for staff — never guessed.
 * 2. Projection — the linked customer's Dynamics contracts and tickets are copied into the site's own Contract and
 *    ServiceRequest tables (tagged with crmId), so the portal and the app — built on those tables, with a chat and
 *    requests per contract — show the customer's real data unchanged. Read-only: Dynamics stays the master and every
 *    refresh overwrites the copy. Only what the old app showed customers is copied: records with «Send To Site».
 */

const F = "@OData.Community.Display.V1.FormattedValue";
type Data = Record<string, unknown>;
type Row = { crmId: string; data: Data; state: number | null; crmModifiedAt: Date | null };

/** Dynamics contract types («نوع قرارداد») → the website taxonomy, so the app shows its Persian name and icon. */
const CATEGORY_SLUG: Record<string, string> = {
  Ambulant: "health-supplement", Stationär: "health-supplement", Augenzusatz: "naturopath-glasses", Krankentagegeld: "health-supplement",
  GKV: "gkv", PKV: "pkv", Zahnzusats: "dental", "Tier-Kranken": "pets", "Tierhalter-Haftphlicht": "dog-liability",
  "KFZ-Versicherung": "car", "Auto-Schutzbrief": "roadside-assistance", Anhänger: "vehicles", Moped: "vehicles",
  Motoradversicherung: "vehicles", Wohnmobil: "vehicles", Wohnwagen: "vehicles", "E-Scooter": "vehicles",
  "E-Bike": "bicycle", Fahrradversicherung: "bicycle",
  Haftpflicht: "personal-liability", "Betrieb-Haftphlicht": "service-liability", Rechtsschutz: "legal-protection",
  "Betrieb-Rechtsschutz": "legal-protection", Hausrat: "household-contents", Gebäudeversicherung: "residential-building",
  Mietkaution: "rent-deposit-guarantee", "Glas-Versicherung": "home", Elektroversicherung: "home", Inhaltversicherung: "home",
  Handyversicherung: "insurance", Reiseversicherung: "travel",
  Berufsunfähigkeit: "occupational-disability", "Risikolebens-V": "term-life", Todesfallversicherung: "death-benefit",
  Unfallversicherung: "accident", Renteversicherung: "private-pension",
  Strom: "electricity", Gas: "gas", Internet: "internet", "Sim&Handy": "mobile",
};

/** Payment interval («نوع پرداخت») → months, to show every amount as a monthly price. */
const INTERVAL_MONTHS: Record<string, number> = { ماهیانه: 1, "هر سه ماه": 3, "هر نیم سال": 6, سالیانه: 12 };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
const lower = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : null);
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

// ---- 1. Link -------------------------------------------------------------------------------------------------

/** The account's contact, linking it automatically when the match is unambiguous. Null when not linked. */
export async function linkedContactId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true, phone: true, crmContactId: true, crmLinkMethod: true } });
  if (!user || user.role !== "CUSTOMER") return null;
  // Linked, or set by staff (including deliberately unlinked): never re-matched automatically.
  if (user.crmContactId || user.crmLinkMethod === "staff") return user.crmContactId;

  for (const [method, key] of [["email", emailKey(user.email)], ["phone", phoneKey(user.phone)]] as const) {
    if (!key) continue;
    const matches = await prisma.crmRecord.findMany({ where: { entity: "contact", deletedAt: null, refs: { has: key } }, select: { crmId: true }, take: 2 });
    if (matches.length === 1) {
      const contactId = matches[0].crmId.toLowerCase();
      await prisma.user.update({ where: { id: userId }, data: { crmContactId: contactId, crmLinkMethod: method, crmLinkedAt: new Date() } });
      return contactId;
    }
    if (matches.length > 1) return null; // two customers share it — staff decide
  }
  return null;
}

/** Staff: link an account to a contact (by its GUID or customer number «شماره مشتری»). */
export async function linkCustomer(userId: string, contactRef: string): Promise<string> {
  const ref = contactRef.trim();
  const contact = isGuid(ref)
    ? await prisma.crmRecord.findFirst({ where: { entity: "contact", deletedAt: null, crmId: { equals: ref, mode: "insensitive" } }, select: { crmId: true } })
    : await prisma.crmRecord.findFirst({ where: { entity: "contact", deletedAt: null, data: { path: ["new_customernumber"], equals: ref } }, select: { crmId: true } });
  if (!contact) throw new Error("not_found");
  const contactId = contact.crmId.toLowerCase();
  await unlinkProjection(userId);
  await prisma.user.update({ where: { id: userId }, data: { crmContactId: contactId, crmLinkMethod: "staff", crmLinkedAt: new Date(), crmSyncedAt: null } });
  await refreshCustomerFromCrm(userId, { force: true });
  return contactId;
}

/** Staff: undo a link (e.g. a wrong automatic match). The account won't be linked automatically again. */
export async function unlinkCustomer(userId: string) {
  await unlinkProjection(userId);
  // "staff" with no contact = deliberately unlinked: the automatic match won't run again for this account.
  await prisma.user.update({ where: { id: userId }, data: { crmContactId: null, crmLinkMethod: "staff", crmLinkedAt: new Date(), crmSyncedAt: null } });
}

/** Removes the projected rows of an account, except those a customer has already used (messages / documents). */
async function unlinkProjection(userId: string) {
  await prisma.serviceRequest.deleteMany({ where: { customerId: userId, crmId: { not: null }, messages: { none: {} } } });
  const contracts = await prisma.contract.findMany({
    where: { customerId: userId, crmId: { not: null } },
    select: { id: true, documents: { select: { id: true }, take: 1 }, serviceRequests: { select: { id: true }, take: 1 }, conversations: { select: { id: true, messages: { select: { id: true }, take: 1 } } } },
  });
  for (const c of contracts) {
    const used = c.documents.length || c.serviceRequests.length || c.conversations.some((cv) => cv.messages.length);
    if (used) {
      await prisma.contract.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
      continue;
    }
    await prisma.conversation.deleteMany({ where: { contractId: c.id } });
    await prisma.contract.delete({ where: { id: c.id } });
  }
}

// ---- 2. Projection ---------------------------------------------------------------------------------------------

function contractStatus(r: Row): ContractStatus {
  if (r.state === 2) return "CANCELLED";
  if (r.data[`new_step${F}`] === "Angebot") return "PENDING"; // an offer, not signed yet
  return "ACTIVE";
}

function monthlyPrice(d: Data): string | null {
  const amount = typeof d.new_mablaq === "number" ? d.new_mablaq : null;
  const months = INTERVAL_MONTHS[String(d[`new_mah${F}`] ?? "")];
  if (!amount || !months) return null;
  return (amount / months).toFixed(2);
}

function requestStatus(r: Row): RequestStatus {
  return r.state === 0 ? "UNDER_REVIEW" : "COMPLETED";
}

/**
 * Brings the account's projected contracts and tickets up to date with the mirror — only when something of this
 * customer changed in the mirror since the last refresh (one indexed query otherwise). Called when the portal or
 * the app loads; links the account first if it isn't yet.
 */
export async function refreshCustomerFromCrm(userId: string, opts: { force?: boolean } = {}) {
  const contactId = await linkedContactId(userId);
  if (!contactId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { crmSyncedAt: true } });
  if (!opts.force && user?.crmSyncedAt) {
    const changed = await prisma.crmRecord.findFirst({
      where: { refs: { has: contactId }, entity: { in: ["opportunity", "incident"] }, syncedAt: { gt: user.crmSyncedAt } },
      select: { id: true },
    });
    if (!changed) return;
  }
  const startedAt = new Date();

  const rows = (await prisma.crmRecord.findMany({
    where: { refs: { has: contactId }, entity: { in: ["opportunity", "incident"] }, deletedAt: null },
    select: { entity: true, crmId: true, data: true, state: true, crmModifiedAt: true },
  })) as (Row & { entity: string })[];
  // The customer's own records that the old app showed them («Send To Site»).
  const own = rows.filter((r) => lower(r.data._customerid_value) === contactId && r.data.new_send_to_site === true);

  const contractIdByCrm = new Map<string, string>();
  const seenContracts = new Set<string>();
  for (const r of own.filter((x) => x.entity === "opportunity")) {
    const crmId = r.crmId.toLowerCase();
    seenContracts.add(crmId);
    const d = r.data;
    const category = String(d[`_new_category_value${F}`] ?? "");
    const status = contractStatus(r);
    // Dynamics doesn't move an active contract's deadline / end date on automatic renewal, so passed ones are stale
    // (an active contract "overdue for 2 years") — not shown to the customer. Ended contracts keep their dates.
    const current = (v: unknown) => {
      const d0 = date(v);
      return status !== "CANCELLED" && d0 && d0.getTime() < startOfToday() ? null : d0;
    };
    const fields = {
      provider: str(d[`_parentaccountid_value${F}`]) ?? str(d[`_new_contract_company_value${F}`]) ?? str(d.name) ?? "—",
      productName: str(d.name) ?? category ?? "—",
      category: CATEGORY_SLUG[category] ?? (category || "other"),
      contractNumber: str(d.new_shomareh),
      startDate: date(d.new_startdate),
      endDate: current(d.new_dateend),
      cancellationDeadline: current(d.new_datelaqve),
      priceMonthly: monthlyPrice(d),
      status,
    };
    const existing = await prisma.contract.findFirst({ where: { customerId: userId, crmId }, select: { id: true } });
    const saved = existing
      ? await prisma.contract.update({ where: { id: existing.id }, data: fields, select: { id: true } })
      : await prisma.contract.create({ data: { ...fields, crmId, customerId: userId, createdAt: date(d.createdon) ?? undefined }, select: { id: true } });
    contractIdByCrm.set(crmId, saved.id);
  }
  // Contracts no longer the customer's in Dynamics (deleted, moved to someone else, «Send To Site» taken off).
  await prisma.contract.updateMany({ where: { customerId: userId, crmId: { not: null, notIn: [...seenContracts] } }, data: { status: "CANCELLED" } });

  for (const r of own.filter((x) => x.entity === "incident")) {
    const crmId = r.crmId.toLowerCase();
    const d = r.data;
    const fields = {
      subjectType: "other",
      subject: str(d.title) ?? str(d.ticketnumber) ?? "—",
      description: str(d.description),
      status: requestStatus(r),
      contractId: contractIdByCrm.get(lower(d._new_opportunity_value) ?? "") ?? null,
    };
    const existing = await prisma.serviceRequest.findFirst({ where: { customerId: userId, crmId }, select: { id: true } });
    if (existing) await prisma.serviceRequest.update({ where: { id: existing.id }, data: fields });
    else await prisma.serviceRequest.create({ data: { ...fields, crmId, customerId: userId, createdAt: date(d.createdon) ?? undefined } });
  }

  await prisma.user.update({ where: { id: userId }, data: { crmSyncedAt: startedAt } });
}

/**
 * The refresh once per request, shared by the portal layout and its pages: Next.js renders them in parallel, so a
 * page reading contracts must wait for the same refresh the layout started (else the first visit shows old data).
 * Never throws — a failed refresh only means slightly older data.
 */
export const refreshCustomerForRequest = cache(async (userId: string | undefined) => {
  if (!userId) return;
  await refreshCustomerFromCrm(userId).catch((e) => console.error("crm customer refresh:", e instanceof Error ? e.message : e));
});
