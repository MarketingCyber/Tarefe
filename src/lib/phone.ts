/**
 * German phone-number check shared by the consultation form (client) and
 * POST /api/leads (server) — one definition so the two can never disagree.
 *
 * Accepted (team requirement, 2026-10-14): numbers that start with
 *   01…     national form,       e.g. 0171 1234567
 *   0049…   international form,  e.g. 0049 171 1234567
 *   +49…    international form,  e.g. +49 171 1234567
 *
 * Why: the fake leads that flooded the form on 2026-10-12→14 all carried
 * 10-digit US-style numbers (3488031578, +14763872486 …) that fit none of
 * these. The form's phone is also the WhatsApp contact, so a German number
 * is what the team can actually use.
 *
 * Deliberate leniencies, so real people are not turned away:
 *  - spaces, dots, dashes, slashes and brackets are ignored while checking;
 *  - the optional "(0)" after the country code ("+49 (0) 171 …") is allowed;
 *  - a German MOBILE number typed without its leading 0 (176 80497199 —
 *    one real lead did exactly this) is accepted: mobile prefixes are 15x,
 *    16x and 17x.
 * The value stored and sent to the CRM is the visitor's own text, unchanged.
 */
export function isGermanPhone(raw: string): boolean {
  let s = raw.trim().replace(/[\s().\/-]/g, "");
  if (!/^\+?\d+$/.test(s)) return false;

  // "+49 (0) 171 …" / "0049 0171 …": drop the optional trunk 0 after the country code.
  s = s.replace(/^(\+49|0049)0/, "$1");

  if (s.startsWith("+49")) return /^\+49[1-9]\d{8,12}$/.test(s);
  if (s.startsWith("0049")) return /^0049[1-9]\d{8,12}$/.test(s);
  if (s.startsWith("01")) return /^01\d{8,12}$/.test(s);
  // Mobile written without the leading 0 (15x / 16x / 17x + 7–9 digits).
  return /^1[5-7]\d{8,10}$/.test(s);
}

export const GERMAN_PHONE_ERROR = {
  fa: "شماره تماس باید شماره آلمانی باشد و با 01، 0049 یا ‎+49‎ شروع شود (مثلاً 0171 1234567).",
  de: "Bitte eine deutsche Nummer angeben, die mit 01, 0049 oder +49 beginnt (z. B. 0171 1234567).",
  ru: "Укажите немецкий номер, начинающийся с 01, 0049 или +49 (например, 0171 1234567).",
} as const;
