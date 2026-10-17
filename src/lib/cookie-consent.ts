/**
 * Consent for non-essential storage (Phase 12.2 / the cookie-policy page's
 * own "consent management will land in a later phase" note — this is that
 * phase). Scoped to what the site actually does: `src/lib/analytics.ts`
 * writes a session id to localStorage, and under Germany's TTDSG (which
 * covers "storage of information on the terminal device" generally, not
 * just cookies by name) that needs opt-in consent same as a tracking
 * cookie would — the NextAuth session cookie is separately exempt as
 * strictly necessary and isn't gated by this.
 *
 * Default is "no consent yet" → analytics stays off until a visitor
 * explicitly accepts, which is the opt-in model GDPR/TTDSG actually
 * require (not opt-out with a dismissible banner that doesn't block
 * anything).
 */
export const CONSENT_KEY = "tarefe:cookie_consent";
export const CONSENT_CHANGED_EVENT = "tarefe:consent-changed";

export type ConsentValue = "accepted" | "necessary";

export function getConsent(): ConsentValue | null {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "accepted" || v === "necessary" ? v : null;
  } catch {
    // localStorage unavailable (private mode, blocked storage) — treat as
    // no consent given, which is the safe default (analytics stays off).
    return null;
  }
}

/**
 * Counts the banner decision on our own server (cookie-free, nothing stored, no id sent —
 * see /api/funnel-event), only so the analytics page can show how many visitors accept.
 */
function countDecision(value: ConsentValue) {
  try {
    const body = JSON.stringify({ name: value === "accepted" ? "consent_accepted" : "consent_declined", path: window.location.pathname.slice(0, 300) });
    if (!navigator.sendBeacon?.("/api/funnel-event", new Blob([body], { type: "application/json" }))) {
      fetch("/api/funnel-event", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // counting must never get in the way of the visitor's choice
  }
}

export function setConsent(value: ConsentValue) {
  countDecision(value);
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
  } catch {
    // If storage is blocked, the choice can't persist — the banner will
    // just reappear next visit, which is honest rather than silently
    // pretending the choice was saved.
  }
}
