import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { linkedContactId } from "@/lib/crm/customer-link";

/**
 * Referral codes, one system across the old CRM, the website and the app.
 *
 * Owner's rules (2026-10-23, docs/app-redesign/02-old-app-inventory.md): the referrer gets a 10 € voucher when
 *  1. the referrer has an active contract with Tarefe, and
 *  2. the referred person signs a contract and doesn't cancel it within 14 days (the withdrawal period).
 * No points: the old CRM's points / star levels are left behind in the new system (owner, 2026-11-14) — staff still
 * see them on Customer 360 with the rest of the old data.
 *
 * Codes (owner, 2026-11-11): existing customers keep the code they already have in the old CRM (contact.new_id,
 * e.g. "000026") — the links they shared (tarefe.de/referral/000026) keep working. Customers without one get a
 * random code (never built from the name), e.g. TRF-7QK4-M9XD, from characters that can't be confused when typed.
 * Share links keep the old form https://tarefe.de/referral/<code>. Opening one remembers the code (REFERRAL_COOKIE)
 * for a website sign-up or request; the app sends it with the sign-in. Who referred whom is stored on the new
 * account (User.referredByCode) and the lead (Lead.referralCode), and written into the lead description sent to the
 * old CRM, where operators handle the voucher until the rules are checked automatically.
 */

export { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS, REFERRAL_CODE, cleanReferralCode, referralLink } from "@/lib/referral-code";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const newCode = () => `TRF-${block()}-${block()}`;

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
