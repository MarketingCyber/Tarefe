/**
 * Traffic-source classification — PURE functions with no browser or server
 * dependencies, so the SAME rules run in the visitor's browser (lib/analytics.ts,
 * consent-gated event tracking) and on the server (lib/landing-hits.ts, the
 * cookie-free landing counter). One definition means the two can never
 * disagree about what counts as Google Ads, organic, referral or direct.
 */
export interface UtmSnapshot {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export const DIRECT: UtmSnapshot = { source: "(direct)", medium: "(none)" };

const TLD = "(?:com?|[a-z]{2})(?:\\.[a-z]{2})?";

/** Social referrers → normalised source name. Tested in order; first match wins. */
const SOCIAL_HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook|fb)\.com$|^fb\.me$/, "facebook"],
  [/(^|\.)(twitter|x)\.com$|^t\.co$/, "twitter"],
  [/(^|\.)linkedin\.com$|^lnkd\.in$/, "linkedin"],
  [/(^|\.)youtube\.com$|^youtu\.be$/, "youtube"],
  [/^t\.me$|(^|\.)telegram\.(org|me)$/, "telegram"],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, "whatsapp"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)pinterest\.[a-z.]+$/, "pinterest"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/(^|\.)threads\.net$/, "threads"],
];

/** Search engines → normalised source name (medium "organic"). */
const SEARCH_HOSTS: [RegExp, string][] = [
  // Only Google's SEARCH hosts — mail.google.com, docs.google.com… are ordinary referrals.
  [new RegExp(`^((www|images|news|scholar|encrypted)\\.)?google\\.${TLD}$`), "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [new RegExp(`(^|\\.)yahoo\\.${TLD}$`), "yahoo"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)ecosia\.org$/, "ecosia"],
  [new RegExp(`(^|\\.)yandex\\.${TLD}$`), "yandex"],
  [/(^|\.)baidu\.com$/, "baidu"],
  [/(^|\.)startpage\.com$/, "startpage"],
  [/(^|\.)search\.brave\.com$/, "brave"],
  [/(^|\.)qwant\.com$/, "qwant"],
];

/** Google's ad-serving hosts: a click that came through one of these is a paid click even without a gclid. */
const GOOGLE_ADS_HOSTS = /(^|\.)(googleadservices\.com|doubleclick\.net|googlesyndication\.com)$/;

/** Paid click ids appended by ad platforms' auto-tagging — present even when the ad has NO utm_* params. */
function clickIdSource(params: URLSearchParams): UtmSnapshot | null {
  if (params.get("gclid") || params.get("gbraid") || params.get("wbraid") || params.get("dclid")) return { source: "google", medium: "cpc" };
  if (params.get("msclkid")) return { source: "bing", medium: "cpc" };
  if (params.get("ttclid")) return { source: "tiktok", medium: "cpc" };
  return null;
}

/**
 * Source/medium for a visit from document.referrer — the same buckets Google
 * Analytics uses (organic / social / referral). Returns null for a direct visit
 * (no referrer) AND for our own pages (internal navigation is not a traffic
 * source). Pure function, exported for tests.
 */
export function deriveFromReferrer(referrer: string, ownHost: string): UtmSnapshot | null {
  if (!referrer) return null;
  // Android's Google app: the referrer is an android-app:// URL, not http(s).
  if (referrer.startsWith("android-app://com.google.android.googlequicksearchbox")) return { source: "google", medium: "organic" };
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (isOwnHost(host, ownHost)) return null;

  if (GOOGLE_ADS_HOSTS.test(host)) return { source: "google", medium: "cpc" };
  for (const [re, name] of SEARCH_HOSTS) if (re.test(host)) return { source: name, medium: "organic" };
  for (const [re, name] of SOCIAL_HOSTS) if (re.test(host)) return { source: name, medium: "social" };
  return { source: host.replace(/^www\./, ""), medium: "referral" };
}

function isOwnHost(host: string, ownHost: string): boolean {
  const own = ownHost.toLowerCase().replace(/^www\./, "");
  return host === own || host === `www.${own}` || host.endsWith(`.${own}`);
}

function readUtm(params: URLSearchParams): UtmSnapshot | null {
  const clean = (v: string | null, lower: boolean) => {
    const t = v?.trim();
    return t ? (lower ? t.toLowerCase() : t) : undefined;
  };
  // source/medium are lower-cased so "Google" / "google" and "CPC" / "cpc" are one row, not two.
  const snapshot: UtmSnapshot = {
    source: clean(params.get("utm_source"), true),
    medium: clean(params.get("utm_medium"), true),
    campaign: clean(params.get("utm_campaign"), false),
    term: clean(params.get("utm_term"), false),
    content: clean(params.get("utm_content"), false),
  };
  return Object.values(snapshot).some(Boolean) ? snapshot : null;
}

export interface Classification {
  /** The source, or null when there is none (direct, or an internal referrer). */
  snap: UtmSnapshot | null;
  /** True when it came from the page URL itself (utm_* / click id) rather than the referrer. */
  fromUrl: boolean;
  /** True when the referrer is one of our own pages. */
  internal: boolean;
}

/**
 * Classify a page load from its query string and referrer. Precedence:
 *   1. explicit utm_source / utm_medium  (always wins)
 *   2. a paid click id (gclid, gbraid, wbraid, dclid, msclkid, ttclid) → e.g. google / cpc,
 *      with the campaign name "(auto-tagged)" unless a utm_campaign is also present
 *   3. utm_campaign/term/content alone (no source) — kept as-is
 *   4. the referrer: search engine → organic, social network → social, ad server → cpc, any other site → referral
 *   5. nothing → null (direct)
 * Pure function, exported for tests.
 */
export function classifySource(search: string, referrer: string, ownHost: string): Classification {
  const params = new URLSearchParams(search);
  const utm = readUtm(params);
  const click = clickIdSource(params);

  if (utm && (utm.source || utm.medium)) {
    // utm_source=google with a click id but no medium → it is a paid click.
    return { snap: { ...utm, medium: utm.medium ?? click?.medium }, fromUrl: true, internal: false };
  }
  if (click) {
    return { snap: { ...click, campaign: utm?.campaign ?? "(auto-tagged)", term: utm?.term, content: utm?.content }, fromUrl: true, internal: false };
  }
  if (utm) return { snap: utm, fromUrl: true, internal: false };

  const derived = deriveFromReferrer(referrer, ownHost);
  if (derived) return { snap: derived, fromUrl: false, internal: false };
  let internal = false;
  try {
    internal = !!referrer && isOwnHost(new URL(referrer).hostname.toLowerCase(), ownHost);
  } catch {
    internal = false;
  }
  return { snap: null, fromUrl: false, internal };
}
