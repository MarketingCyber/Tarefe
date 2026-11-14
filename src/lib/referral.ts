import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { linkedContactId } from "@/lib/crm/customer-link";

/**
 * Referral codes and points, one system across the old CRM, the website and the app (owner's decision 2026-11-11):
 *
 *  - Existing customers keep the code they already have in the old CRM (contact.new_id, e.g. "000026") — the links
 *    they shared (tarefe.de/referral/000026) keep working. Customers without one get a random code (owner's rule:
 *    never built from the name), e.g. TRF-7QK4-M9XD, from characters that can't be confused when typed.
 *  - Share links keep the old form: https://tarefe.de/referral/<code>. Opening one remembers the code
 *    (REFERRAL_COOKIE) for a website sign-up or request; the app sends it with the sign-in.
 *  - Who referred whom is stored on the new account (User.referredByCode) and the lead (Lead.referralCode), and
 *    written into the lead description sent to the old CRM, where operators credit it. Points stay the old CRM's:
 *    its workflows create them (new_points) and add them up (contact.new_total_point_rollup); shown read-only.
 */

export { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS, REFERRAL_CODE, cleanReferralCode, referralLink } from "@/lib/referral-code";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const newCode = () => `TRF-${block()}-${block()}`;

const F = "@OData.Community.Display.V1.FormattedValue";
type Data = Record<string, unknown>;

async function contactData(contactId: string): Promise<Data | null> {
  const row = await prisma.crmRecord.findFirst({
    where: { entity: "contact", deletedAt: null, crmId: { equals: contactId, mode: "insensitive" } },
    select: { data: true },
  });
  return (row?.data as Data | undefined) ?? null;
}

/** Whose code this is: a site / app account or an old-CRM customer. Null when nobody has it. */
export async function referrerOf(code: string): Promise<{ name: string | null; customerNumber: string | null } | null> {
  const user = await prisma.user.findFirst({ where: { referralCode: { equals: code, mode: "insensitive" } }, select: { name: true } });
  if (user) return { name: user.name || null, customerNumber: null };
  const contact = await prisma.crmRecord.findFirst({
    where: { entity: "contact", deletedAt: null, data: { path: ["new_id"], equals: code } },
    select: { data: true },
  });
  if (!contact) return null;
  const d = contact.data as Data;
  return { name: typeof d.fullname === "string" ? d.fullname : null, customerNumber: typeof d.new_customernumber === "string" ? d.new_customernumber : null };
}

/** One line for the lead / note an operator reads in the old CRM. */
export async function referralNote(code: string | null): Promise<string | null> {
  if (!code) return null;
  const who = await referrerOf(code);
  const name = who ? [who.name, who.customerNumber && `شماره مشتری ${who.customerNumber}`].filter(Boolean).join("، ") : "معرف پیدا نشد";
  return `کد معرف: ${code} (${name})`;
}

/**
 * The customer's code: their old-CRM code when the account is linked to a customer who has one, else a random one
 * made on first request. A random code shared before the account was linked is replaced by the old code then —
 * the old one is what the customer already knows and what the old CRM credits.
 */
export async function customerReferralCode(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  const contactId = await linkedContactId(userId);
  const oldCode = contactId ? (await contactData(contactId))?.new_id : null;
  if (typeof oldCode === "string" && oldCode.trim()) {
    const code = oldCode.trim();
    if (user?.referralCode === code) return code;
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch (error) {
      // Another account already holds it (a duplicate customer): keep what this one has.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
    }
  }

  let code = user?.referralCode ?? null;
  for (let attempt = 0; !code && attempt < 5; attempt++) {
    try {
      const candidate = newCode();
      const set = await prisma.user.updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: candidate } });
      code = set.count ? candidate : ((await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } }))?.referralCode ?? null);
    } catch (error) {
      // Unique clash with another customer's code: try a new one. Anything else is a real error.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
    }
  }
  return code;
}

/**
 * earned: counts in the total (active in Dynamics); redeemed: turned into a gift card («کد هدیه», closed);
 * pending: closed for now, e.g. a friend introduced whose contract isn't confirmed yet. Dynamics' total (rollup)
 * adds up the active ones only.
 */
export type PointStatus = "earned" | "redeemed" | "pending";
export type PointItem = { id: string; label: string; points: number; at: string; status: PointStatus; note: string | null };
export type CustomerPoints = { total: number; items: PointItem[] } | null;

/**
 * The linked customer's points from the old CRM: the total Dynamics keeps (rollup) and the entries it showed on the
 * old site («Send To Site»), newest first. Null for an account not linked to a customer (no points system yet).
 */
export async function customerPoints(userId: string): Promise<CustomerPoints> {
  const contactId = await linkedContactId(userId);
  if (!contactId) return null;
  const contact = await contactData(contactId);
  const rows = await prisma.crmRecord.findMany({
    where: { entity: "new_points", deletedAt: null, refs: { has: contactId } },
    select: { crmId: true, data: true },
  });
  const items = rows
    .map((r) => r.data as Data)
    .filter((d) => String(d._new_customer_value ?? "").toLowerCase() === contactId && d.new_send_to_site === true)
    .map((d, i) => ({
      id: String(d.new_pointsid ?? rows[i].crmId).toLowerCase(),
      label: String(d[`new_type${F}`] ?? d.new_topic ?? "امتیاز").trim(),
      points: Number(d.new_point ?? 0) || 0,
      at: String(d.createdon ?? ""),
      status: (Number(d.statecode) === 0 ? "earned" : d[`new_type${F}`] === "کد هدیه" ? "redeemed" : "pending") as PointStatus,
      note: typeof d.new_gift_code_desc === "string" && d.new_gift_code_desc.trim() ? d.new_gift_code_desc.trim() : null,
    }))
    .filter((p) => p.points !== 0)
    .sort((a, b) => b.at.localeCompare(a.at));
  const rollup = Number(contact?.new_total_point_rollup);
  const total = Number.isFinite(rollup) ? rollup : items.filter((p) => p.status === "earned").reduce((s, p) => s + p.points, 0);
  return { total, items };
}
