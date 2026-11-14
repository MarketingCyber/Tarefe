/** Referral code basics without database access (used by sign-in code too) — the rest is in lib/referral.ts. */

export const REFERRAL_COOKIE = "tarefe_ref";
export const REFERRAL_COOKIE_DAYS = 30;
export const referralLink = (code: string) => `https://tarefe.de/referral/${encodeURIComponent(code)}`;

/** Old CRM codes are digits (a few are short words like "yassin051"); new ones TRF-XXXX-XXXX. */
export const REFERRAL_CODE = /^[A-Za-z0-9-]{3,20}$/;
export const cleanReferralCode = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const code = v.trim();
  return REFERRAL_CODE.test(code) ? (code.startsWith("trf-") ? code.toUpperCase() : code) : null;
};
