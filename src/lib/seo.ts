import { LOCALES, type Locale } from "./taxonomy";

const SITE_URL = "https://tarefe.de";

/**
 * Builds correct canonical + hreflang alternates for a page, given the
 * path *after* the locale segment (e.g. "services/insurance/health/pkv",
 * or "" for the homepage). Every locale variant points at the same
 * taxonomy path — per the architecture, only the /fa|de|ru/ prefix changes,
 * the path underneath stays identical across languages.
 */
export function buildAlternates(locale: Locale, pathAfterLocale: string) {
  const suffix = pathAfterLocale ? `/${pathAfterLocale}` : "";
  return {
    canonical: `${SITE_URL}/${locale}${suffix}`,
    languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${suffix}`])),
  };
}
