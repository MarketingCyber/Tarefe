import { prisma } from "@/lib/db";
import { linkedContactId } from "@/lib/crm/customer-link";
import { emailKey, phoneKey } from "@/lib/dynamics/identity";

/**
 * The owner's referral rules (2026-10-23), checked from the old-CRM mirror — the referrer gets a 10 € voucher when:
 *   1. the friend signs a contract (a Dynamics contract in stage «Aktuell» / «AktuellT», not the offer «Angebot»)
 *      made after the referral, and doesn't cancel it within 14 days, and
 *   2. the referrer has an active contract (signed, not closed as lost / cancelled).
 *
 * Dynamics has no "signed on" date, so the 14 days start when this check first sees the contract signed (for a
 * contract already signed at the first check: its creation date). A cancellation after the 14 days doesn't take the
 * voucher away; a contract closed because it was replaced by another one isn't a cancellation.
 * Staff send the voucher and record it on /ops/referrals («sent» is never re-checked).
 */

export const REFERRAL_STATUS_FA: Record<string, string> = {
  waiting_customer: "منتظر ثبت دوست در CRM",
  waiting_contract: "منتظر قرارداد دوست",
  waiting_period: "منتظر پایان ۱۴ روز",
  friend_cancelled: "دوست در ۱۴ روز فسخ کرد",
  referrer_no_contract: "معرف قرارداد فعال ندارد",
  due: "کارت هدیه قابل ارسال",
  sent: "کارت هدیه فرستاده شد",
  invalid: "نامعتبر",
};

const F = "@OData.Community.Display.V1.FormattedValue";
const DAY = 86_400_000;
const PERIOD = 14 * DAY;
type Data = Record<string, unknown>;
type Opp = { crmId: string; data: Data; state: number | null };

const lower = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : null);
const date = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
const signed = (o: Opp) => o.data[`new_step${F}`] !== "Angebot";
const replaced = (o: Opp) => String(o.data[`statuscode${F}`] ?? "").includes("جایگزین");
/** When the contract was cancelled, or null when it wasn't (open, won, or closed because it was replaced). */
const cancelledAt = (o: Opp) => (o.state === 2 && !replaced(o) ? (date(o.data.new_cancellation_date) ?? date(o.data.actualclosedate) ?? new Date(0)) : null);

async function contractsOf(contactId: string): Promise<Opp[]> {
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "opportunity", deletedAt: null, refs: { has: contactId } },
    select: { crmId: true, data: true, state: true },
  });
  return (rows as Opp[]).filter((r) => lower(r.data._customerid_value) === contactId);
}

/** The referrer behind a code: an account (and its linked customer) or an old-CRM customer by its old code. */
async function findReferrer(code: string): Promise<{ userId: string | null; contactId: string | null } | null> {
  const user = await prisma.user.findFirst({ where: { referralCode: { equals: code, mode: "insensitive" } }, select: { id: true } });
  if (user) return { userId: user.id, contactId: await linkedContactId(user.id) };
  const contact = await prisma.crmRecord.findFirst({ where: { entity: "contact", deletedAt: null, data: { path: ["new_id"], equals: code } }, select: { crmId: true } });
  return contact ? { userId: null, contactId: contact.crmId.toLowerCase() } : null;
}

/** A website lead's Dynamics customer: the one contact with its e-mail, else its phone (never guessed). */
async function contactForLead(leadId: string): Promise<string | null> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true, phone: true } });
  for (const key of [emailKey(lead?.email), phoneKey(lead?.phone)]) {
    if (!key) continue;
    const matches = await prisma.crmRecord.findMany({ where: { entity: "contact", deletedAt: null, refs: { has: key } }, select: { crmId: true }, take: 2 });
    if (matches.length === 1) return matches[0].crmId.toLowerCase();
    if (matches.length > 1) return null;
  }
  return null;
}

/** Adds referrals for new accounts / leads that came with a code. */
async function collect() {
  const [users, leads, known] = await Promise.all([
    prisma.user.findMany({ where: { referredByCode: { not: null }, role: "CUSTOMER" }, select: { id: true, referredByCode: true, createdAt: true } }),
    prisma.lead.findMany({ where: { referralCode: { not: null } }, select: { id: true, referralCode: true, createdAt: true } }),
    prisma.referral.findMany({ select: { userId: true, leadId: true } }),
  ]);
  const haveUser = new Set(known.map((k) => k.userId).filter(Boolean));
  const haveLead = new Set(known.map((k) => k.leadId).filter(Boolean));
  for (const u of users) if (!haveUser.has(u.id)) await prisma.referral.create({ data: { code: u.referredByCode!, userId: u.id, createdAt: u.createdAt } });
  for (const l of leads) if (!haveLead.has(l.id)) await prisma.referral.create({ data: { code: l.referralCode!, leadId: l.id, createdAt: l.createdAt } });
}

type Result = { status: string; statusNote?: string | null; referredContactId?: string | null; referrerContactId?: string | null; referrerUserId?: string | null; contractCrmId?: string | null; signedAt?: Date | null };

async function evaluate(r: Awaited<ReturnType<typeof prisma.referral.findMany>>[number], claimed: Map<string, string>): Promise<Result> {
  const referrer = await findReferrer(r.code);
  if (!referrer) return { status: "invalid", statusNote: "کد معرف پیدا نشد" };
  const base = { referrerUserId: referrer.userId, referrerContactId: referrer.contactId };

  const friend = r.userId ? await linkedContactId(r.userId) : r.leadId ? await contactForLead(r.leadId) : null;
  if (!friend) return { ...base, status: "waiting_customer" };
  if (friend === referrer.contactId || (r.userId && r.userId === referrer.userId)) return { ...base, referredContactId: friend, status: "invalid", statusNote: "خودش را معرفی کرده" };
  // The same person through a lead and an account (or two codes): only the first referral counts.
  const first = claimed.get(friend);
  if (first && first !== r.id) return { ...base, referredContactId: friend, status: "invalid", statusNote: "این دوست قبلاً معرفی شده" };
  claimed.set(friend, r.id);
  const withFriend = { ...base, referredContactId: friend };

  // The friend's signed contracts made after the referral (a day's slack: the lead and the contract can share a day).
  const contracts = (await contractsOf(friend))
    .filter((o) => signed(o) && (date(o.data.createdon)?.getTime() ?? 0) >= r.createdAt.getTime() - DAY)
    .sort((a, b) => String(a.data.createdon).localeCompare(String(b.data.createdon)));
  if (!contracts.length) return { ...withFriend, status: "waiting_contract" };

  const now = Date.now();
  let waiting: Result | null = null;
  let cancelled: Result | null = null;
  for (const o of contracts) {
    const id = o.crmId.toLowerCase();
    // First seen signed: kept from earlier checks; on the very first check the contract's creation date.
    const signedAt = r.contractCrmId === id && r.signedAt ? r.signedAt : r.checkedAt ? new Date() : (date(o.data.createdon) ?? new Date());
    const periodEnd = signedAt.getTime() + PERIOD;
    const cancel = cancelledAt(o);
    if (cancel && cancel.getTime() < periodEnd) {
      cancelled ??= { ...withFriend, contractCrmId: id, signedAt, status: "friend_cancelled" };
      continue;
    }
    if (now < periodEnd) {
      waiting ??= { ...withFriend, contractCrmId: id, signedAt, status: "waiting_period", statusNote: new Date(periodEnd).toISOString() };
      continue;
    }
    // The friend's side is met — now the referrer needs an active contract.
    const active = referrer.contactId ? (await contractsOf(referrer.contactId)).some((c) => signed(c) && c.state !== 2) : false;
    return { ...withFriend, contractCrmId: id, signedAt, status: active ? "due" : "referrer_no_contract" };
  }
  return waiting ?? cancelled ?? { ...withFriend, status: "waiting_contract" };
}

let lastRun = 0;

/** Re-checks every referral not yet paid. `minIntervalMs` throttles calls from the per-minute sync. */
export async function checkReferrals(minIntervalMs = 0): Promise<{ checked: number; due: number } | null> {
  if (Date.now() - lastRun < minIntervalMs) return null;
  lastRun = Date.now();
  await collect();
  const all = await prisma.referral.findMany({ orderBy: { createdAt: "asc" } });
  // Friends already counted by a referral that's paid keep that claim.
  const claimed = new Map(all.filter((r) => r.status === "sent" && r.referredContactId).map((r) => [r.referredContactId!, r.id]));
  let due = 0;
  for (const r of all.filter((x) => x.status !== "sent")) {
    const result = await evaluate(r, claimed);
    if (result.status === "due") due++;
    await prisma.referral.update({
      where: { id: r.id },
      data: {
        status: result.status,
        statusNote: result.statusNote ?? null,
        referrerUserId: result.referrerUserId ?? null,
        referrerContactId: result.referrerContactId ?? null,
        referredContactId: result.referredContactId ?? null,
        contractCrmId: result.contractCrmId ?? null,
        signedAt: result.signedAt ?? null,
        dueSince: result.status === "due" ? (r.dueSince ?? new Date()) : null,
        checkedAt: new Date(),
      },
    });
  }
  return { checked: all.length, due };
}
