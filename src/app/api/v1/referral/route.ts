import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/app-api";
import type { Locale } from "@/lib/taxonomy";

/**
 * The customer's referral code and the reward rule. Codes are random (owner's rule: never built from the
 * name), e.g. TRF-7QK4-M9XD, using characters that can't be confused when typed (no 0/O, 1/I/L).
 * Tracking who signed up with a code, and paying the voucher, comes with the referral rules (still open).
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
const newCode = () => `TRF-${block()}-${block()}`;

const RULE: Record<Locale, string> = {
  fa: "کارت هدیه ۱۰ یورویی وقتی برایت فرستاده می‌شود که تو یک قرارداد فعال با تعرفه داشته باشی، دوستت قراردادش را امضا کند و تا ۱۴ روز فسخ نکند.",
  de: "Sie erhalten einen 10-€-Gutschein, wenn Sie einen aktiven Vertrag mit Tarefe haben und Ihr Kontakt einen Vertrag unterschreibt und ihn 14 Tage lang nicht kündigt.",
  ru: "Подарочная карта на 10 € придёт, если у вас есть действующий договор с Tarefe, а ваш знакомый подпишет договор и не расторгнет его в течение 14 дней.",
};
const SHARE: Record<Locale, (code: string) => string> = {
  fa: (c) => `با کد معرفی من در تعرفه ثبت‌نام کن. همه خدمات تعرفه رایگان است: ${c}`,
  de: (c) => `Melde dich mit meinem Empfehlungscode bei Tarefe an. Alle Tarefe-Leistungen sind kostenlos: ${c}`,
  ru: (c) => `Зарегистрируйся в Tarefe с моим кодом. Все услуги Tarefe бесплатны: ${c}`,
};

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  let code = (await prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } }))?.referralCode ?? null;
  for (let attempt = 0; !code && attempt < 5; attempt++) {
    try {
      const candidate = newCode();
      const set = await prisma.user.updateMany({ where: { id: user.id, referralCode: null }, data: { referralCode: candidate } });
      code = set.count ? candidate : (await prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } }))?.referralCode ?? null;
    } catch (error) {
      // Unique clash with another customer's code: try a new one. Anything else is a real error.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      code = (await prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true } }))?.referralCode ?? null;
    }
  }

  return ok({ code, reward: { amount: 10, currency: "EUR" }, rule: RULE[user.locale], shareText: code ? SHARE[user.locale](code) : null, invited: [] });
}
