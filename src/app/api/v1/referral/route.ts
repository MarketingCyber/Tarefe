import { ok, requireUser } from "@/lib/app-api";
import { customerPoints, customerReferralCode, referralLink } from "@/lib/referral";
import type { Locale } from "@/lib/taxonomy";

/**
 * The customer's referral code, share link, the reward rule and their points (lib/referral.ts): the old-CRM code
 * for an existing customer (e.g. 000026 — links they already shared keep working), else a random one; points are
 * the old CRM's, read-only.
 */

const RULE: Record<Locale, string> = {
  fa: "کارت هدیه ۱۰ یورویی وقتی برایت فرستاده می‌شود که تو یک قرارداد فعال با تعرفه داشته باشی، دوستت قراردادش را امضا کند و تا ۱۴ روز فسخ نکند.",
  de: "Sie erhalten einen 10-€-Gutschein, wenn Sie einen aktiven Vertrag mit Tarefe haben und Ihr Kontakt einen Vertrag unterschreibt und ihn 14 Tage lang nicht kündigt.",
  ru: "Подарочная карта на 10 € придёт, если у вас есть действующий договор с Tarefe, а ваш знакомый подпишет договор и не расторгнет его в течение 14 дней.",
};
const SHARE: Record<Locale, (code: string) => string> = {
  fa: (c) => `با کد معرفی من در تعرفه ثبت‌نام کن. همه خدمات تعرفه رایگان است. کد: ${c}
${referralLink(c)}`,
  de: (c) => `Melde dich mit meinem Empfehlungscode bei Tarefe an. Alle Tarefe-Leistungen sind kostenlos. Code: ${c}
${referralLink(c)}`,
  ru: (c) => `Зарегистрируйся в Tarefe с моим кодом. Все услуги Tarefe бесплатны. Код: ${c}
${referralLink(c)}`,
};

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const [code, points] = await Promise.all([customerReferralCode(user.id), customerPoints(user.id)]);
  return ok({
    code,
    link: code ? referralLink(code) : null,
    reward: { amount: 10, currency: "EUR" },
    rule: RULE[user.locale],
    shareText: code ? SHARE[user.locale](code) : null,
    points,
    invited: [],
  });
}
