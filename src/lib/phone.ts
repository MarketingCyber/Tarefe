import type { Locale } from "@/lib/taxonomy";

/**
 * German MOBILE number check shared by the consultation form (client) and
 * POST /api/leads (server) — one definition so the two can never disagree.
 *
 * Accepted starts (team requirement, 2026-10-14): 01…, 0049…, +49…
 * Each form has its own EXACT digit count, because German mobile numbers
 * have a fixed structure — 15x/16x/17x followed by 7–8 more digits, i.e. a
 * 10- or 11-digit number once the national leading 0 is taken off:
 *
 *   01…            0171 1234567     → 11 digits in total (12 for 11-digit mobiles)
 *   +49… / 0049…   +49 171 1234567  → 10 or 11 digits after the country code
 *   no leading 0   171 1234567      → 10 or 11 digits  (one real lead typed it this way)
 *
 * MOBILE ONLY — decided by the team on 2026-10-14. Landlines (030…, 06775…)
 * and service numbers (0180, 0137 …) are rejected on purpose: the field is
 * the WhatsApp contact, and a landline has no exact digit count anyway
 * (area codes are 2–5 digits). A landline was briefly allowed the same day
 * after a test number was typed by mistake; that was reverted.
 *
 * Why this exists: the fake leads that flooded the form on 2026-10-12→14
 * all carried 10-digit US-style numbers (3488031578, +14763872486 …).
 *
 * Leniencies so real people are not turned away: spaces, dots, dashes,
 * slashes and brackets are ignored; "+49 (0) 171 …" is fine; and Persian or
 * Arabic-Indic digits (۰۱۷۱…, what a Farsi keyboard types) are read as the
 * digits they are — see toAsciiDigits, also applied server-side before storing.
 */

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits → ASCII 0-9. Everything else is left alone. */
export function toAsciiDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export type PhoneProblem = "format" | "length-national" | "length-international";

/** null when valid; otherwise which rule was broken (so the form can say so). */
export function germanPhoneProblem(raw: string): PhoneProblem | null {
  let s = toAsciiDigits(raw).trim().replace(/[\s().\/-]/g, "");
  if (!/^\+?\d+$/.test(s)) return "format";

  // "+49 (0) 171 …" / "0049 0171 …": drop the optional trunk 0 after the country code.
  s = s.replace(/^(\+49|0049)0/, "$1");

  let rest: string; // the number without 0 / 0049 / +49 — must be 1[5-7]x + 7-8 digits
  let kind: "national" | "international";
  if (s.startsWith("+49")) {
    rest = s.slice(3);
    kind = "international";
  } else if (s.startsWith("0049")) {
    rest = s.slice(4);
    kind = "international";
  } else if (s.startsWith("01")) {
    rest = s.slice(1);
    kind = "national";
  } else if (/^1[5-7]/.test(s)) {
    rest = s; // mobile typed without its leading 0
    kind = "national";
  } else {
    return "format";
  }

  if (!/^1[5-7]/.test(rest)) return "format"; // not a mobile prefix (15x / 16x / 17x)
  if (rest.length !== 10 && rest.length !== 11) return kind === "national" ? "length-national" : "length-international";
  return null;
}

export const isGermanPhone = (raw: string): boolean => germanPhoneProblem(raw) === null;

const MESSAGES: Record<PhoneProblem, Record<Locale, string>> = {
  format: {
    fa: "شماره باید موبایل آلمانی باشد و با 01، 0049 یا ‎+49‎ شروع شود (مثلاً 01xx xxxxxxx).",
    de: "Bitte eine deutsche Handynummer angeben, die mit 01, 0049 oder +49 beginnt (z. B. 01xx xxxxxxx).",
    ru: "Укажите немецкий мобильный номер, начинающийся с 01, 0049 или +49 (например, 01xx xxxxxxx).",
  },
  "length-national": {
    fa: "شماره‌ای که با 01 شروع می‌شود باید 11 یا 12 رقم داشته باشد.",
    de: "Eine Nummer mit 01 am Anfang muss 11 oder 12 Ziffern haben.",
    ru: "Номер, начинающийся с 01, должен содержать 11 или 12 цифр.",
  },
  "length-international": {
    fa: "بعد از ‎+49‎ (یا 0049) باید 10 یا 11 رقم بیاید، بدون صفر اول.",
    de: "Nach +49 (oder 0049) müssen 10 oder 11 Ziffern folgen, ohne die führende 0.",
    ru: "После +49 (или 0049) должно быть 10 или 11 цифр, без первого нуля.",
  },
};

/** The message for the visitor's language, or "" when the number is valid. */
export function germanPhoneError(raw: string, locale: Locale): string {
  const problem = germanPhoneProblem(raw);
  return problem ? MESSAGES[problem][locale] : "";
}
