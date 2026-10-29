/**
 * Cookie settings (2026-10-29, owner's design). Analytics and advertising run from the first page view; a visitor
 * can switch either group off at any time in "Cookie settings" (CookieConsentBanner.tsx, also reachable from the
 * footer and the cookie-policy page), and the switch is real:
 *
 *   analytics  Google Analytics 4, Microsoft Clarity, our own analytics + lead attribution (analytics.ts)
 *   ads        Google Ads, Meta Pixel, the server-side Meta Conversions API lead
 *
 * GoogleTagManager.tsx turns the two groups into Google Consent Mode (analytics_storage / ad_storage …), and the
 * Meta and Clarity tags in GTM require those same consent types, so nothing fires for a group that is off.
 * Stored in localStorage, read client-side only.
 */
export const CONSENT_KEY = "tarefe:cookie_consent"; // "seen" once the notice was closed or settings were saved
export const PREFS_KEY = "tarefe:cookie_prefs";
export const CONSENT_CHANGED_EVENT = "tarefe:consent-changed";
export const OPEN_SETTINGS_EVENT = "tarefe:open-cookie-settings";

export type CookiePrefs = { analytics: boolean; ads: boolean };
export const DEFAULT_PREFS: CookiePrefs = { analytics: true, ads: true };

export function getCookiePrefs(): CookiePrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw) as Partial<CookiePrefs>;
    return { analytics: p.analytics !== false, ads: p.ads !== false };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Analytics group: own analytics, lead attribution, the server-side GA4 lead. */
export function trackingAllowed(): boolean {
  return getCookiePrefs().analytics;
}

/** Advertising group: the server-side Meta lead (the browser tags follow Consent Mode). */
export function adsAllowed(): boolean {
  return getCookiePrefs().ads;
}

/** True once the visitor closed the notice or saved settings (the notice then stays hidden). */
export function noticeSeen(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) !== null;
  } catch {
    return false;
  }
}

export function markNoticeSeen() {
  try {
    window.localStorage.setItem(CONSENT_KEY, "seen");
  } catch {
    // storage blocked: the notice just shows again next visit
  }
}

/** Counts the decision on our own server (cookie-free, no id sent) so the analytics page can show the share. */
function countDecision(prefs: CookiePrefs) {
  try {
    const name = prefs.analytics && prefs.ads ? "consent_accepted" : "consent_declined";
    const body = JSON.stringify({ name, path: window.location.pathname.slice(0, 300) });
    if (!navigator.sendBeacon?.("/api/funnel-event", new Blob([body], { type: "application/json" }))) {
      fetch("/api/funnel-event", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // counting must never get in the way of the visitor's choice
  }
}

export function setCookiePrefs(prefs: CookiePrefs) {
  countDecision(prefs);
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage blocked: the choice applies to this page view only
  }
  markNoticeSeen();
  window.dispatchEvent(new CustomEvent<CookiePrefs>(CONSENT_CHANGED_EVENT, { detail: prefs }));
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
