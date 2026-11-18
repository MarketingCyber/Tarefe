import { DICT } from "./dict";

/**
 * Language of the staff CRM (/ops), 2026-11-18 (owner): Persian (right-to-left, the default), English and German
 * (left-to-right). Chosen with the switch in the side menu, remembered in the `ops_locale` cookie (a preference
 * cookie for staff only — no tracking).
 *
 * Texts are keyed by their Persian original: code keeps the Persian it always had, wrapped in `t("…")`, and the
 * English / German come from DICT. Anything not translated yet simply stays Persian, so a missing entry never
 * breaks a page. Placeholders: `t("{n} لید", { n: 5 })`.
 *
 * Labels that come from the old CRM (stages, statuses, reasons, service names) go through `t()` too; free text
 * written by people (notes, messages, names) is never translated.
 */
export const OPS_LOCALES = ["fa", "en", "de"] as const;
export type OpsLocale = (typeof OPS_LOCALES)[number];
export const OPS_LOCALE_COOKIE = "ops_locale";

export function isOpsLocale(v: unknown): v is OpsLocale {
  return typeof v === "string" && (OPS_LOCALES as readonly string[]).includes(v);
}

export const OPS_DIR: Record<OpsLocale, "rtl" | "ltr"> = { fa: "rtl", en: "ltr", de: "ltr" };

/** For toLocaleString / Intl — dates stay Gregorian in every language. */
export const OPS_INTL: Record<OpsLocale, string> = { fa: "fa-IR", en: "en-GB", de: "de-DE" };

export const OPS_LOCALE_NAMES: Record<OpsLocale, string> = { fa: "فارسی", en: "English", de: "Deutsch" };

export type Vars = Record<string, string | number | null | undefined>;
export type T = (fa: string, vars?: Vars) => string;

function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m));
}

export function translate(locale: OpsLocale, fa: string, vars?: Vars): string {
  if (locale === "fa" || !fa) return fill(fa, vars);
  const entry = DICT[fa];
  return fill(entry ? (locale === "en" ? entry[0] : entry[1]) : fa, vars);
}

export function makeT(locale: OpsLocale): T {
  return (fa, vars) => translate(locale, fa, vars);
}

/** Like t, for values that may be missing (old-CRM fields): null / undefined / "" stay null, so `tn(x) ?? "—"` works. */
export type TN = (fa: string | null | undefined) => string | null;

export type OpsI18n = { locale: OpsLocale; dir: "rtl" | "ltr"; intl: string; t: T; tn: TN };

export function opsI18nFor(locale: OpsLocale): OpsI18n {
  const t = makeT(locale);
  return { locale, dir: OPS_DIR[locale], intl: OPS_INTL[locale], t, tn: (fa) => (fa ? t(fa.trim()) : null) };
}
