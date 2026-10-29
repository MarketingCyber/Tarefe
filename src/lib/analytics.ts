/**
 * First-party, self-hosted event tracking (Phase 10) — no third-party
 * vendor, events land in Postgres via /api/events. `sessionId` is a random
 * client-generated id kept in localStorage; it identifies a browser
 * session for funnel analysis, not a person — nothing here fingerprints,
 * reads IP, or sends PII for an anonymous visitor. Once someone signs in,
 * their actions are already tied to their account elsewhere (leads,
 * contracts, tickets) — this log stays behavioral/anonymous by design.
 *
 * Deliberately NOT "use client": this is a plain utility module (no React
 * components), imported from both client components (to call track()) and
 * the server-only /api/events route (to read the EVENT allowlist). Marking
 * it "use client" turned its exports into client-reference proxies when
 * imported server-side — confirmed by the fact that every event was
 * rejected with a 400 until this was removed, because
 * Object.values(EVENT) wasn't returning the real event-name strings
 * through that boundary.
 *
 * track() fires unless the visitor chose "necessary only" (owner, 2026-10-29 — see
 * trackingAllowed() in src/lib/cookie-consent.ts). It writes a session id to
 * localStorage from the first page view; that was opt-in before the owner chose
 * on-by-default tracking.
 */
import { trackingAllowed } from "./cookie-consent";

export const EVENT = {
  PAGE_VIEW: "page_view",
  SEARCH: "search",
  COMPARISON_STARTED: "comparison_started",
  QUALIFICATION_STARTED: "qualification_started",
  QUALIFICATION_COMPLETED: "qualification_completed",
  CONSULTATION_FORM_STARTED: "consultation_form_started",
  CONSULTATION_SUBMITTED: "consultation_submitted",
  WHATSAPP_CLICKED: "whatsapp_clicked",
  PHONE_CLICKED: "phone_clicked",
  SIGNUP: "signup",
  LOGIN: "login",
  LOGOUT: "logout",
  WEB_VITAL: "web_vital",
  // Added 2026-10-15 for the analytics explorer's funnel — the electricity/
  // gas pages are the main acquisition path and had NO event between "page
  // view" and "form submitted": no way to see who used the calculator or
  // clicked a tariff card.
  ENERGY_CALCULATOR_USED: "energy_calculator_used",
  TARIFF_CTA_CLICKED: "tariff_cta_clicked",
  // Below this line: fired via trackServer() (see analytics-server.ts) from
  // inside a Server Action, not the client track() below — these are
  // staff-triggered CRM lifecycle events with no browser session of their
  // own, added to close the gap flagged 2026-08-31: the full
  // visitor→lead→application→contract funnel used to be unmeasurable in
  // one place because everything past "lead" only ever wrote to
  // ActivityLog (built for the CRM timeline UI, not funnel math).
  MFA_ENABLED: "mfa_enabled",
  MFA_DISABLED: "mfa_disabled",
  LEAD_STATUS_CHANGED: "lead_status_changed",
  APPLICATION_CREATED: "application_created",
  APPLICATION_APPROVED: "application_approved",
  CONTRACT_CREATED: "contract_created",
  CONTRACT_CANCELLED: "contract_cancelled",
  TICKET_CREATED: "ticket_created",
  DOCUMENT_UPLOADED: "document_uploaded",
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];

/**
 * Marketing attribution, captured client-side and stamped onto every event
 * (see track() below) and onto Lead at submission time (ConsultationForm).
 * Three snapshots, each the same five fields (source / medium / campaign /
 * term / content):
 *  - "visit": THIS visit's own classification — utm_* params, else a paid
 *    click id (gclid…), else the referrer (organic / social / referral), else
 *    "(direct) / (none)". The traffic-source reports use this by default, so
 *    "Direct" means visits that really arrived directly.
 *  - "first": written once, the first time this browser is seen, never
 *    overwritten after — "what channel actually brought this person to us".
 *  - "last": the last NON-direct touch, overwritten whenever a visit carries a
 *    real source — the model paid-ads platforms use for conversion attribution.
 *    A direct visit never erases it.
 * Same gate as sessionId below: stored from the first page view unless the
 * visitor chose "necessary only". The landing URL/referrer are *read* as soon
 * as the script loads and kept in memory only, so a visitor who accepts the
 * banner on the second page still gets the source they arrived with.
 */
import { DIRECT, classifySource, type Classification, type UtmSnapshot } from "./traffic-source";
export type { UtmSnapshot, Classification } from "./traffic-source";
export { classifySource, deriveFromReferrer, DIRECT } from "./traffic-source";

// sessionStorage (per tab): this tab's current visit classification + last activity time.
const VISIT_KEY = "tarefe:visit";
// localStorage: the most recent visit (any tab) — lets a link opened in a NEW tab from our own site continue that visit instead of looking "direct".
const VISIT_LAST_KEY = "tarefe:visit_last";
const UTM_FIRST_KEY = "tarefe:utm_first";
const UTM_LAST_KEY = "tarefe:utm_last";
// localStorage: set by opening any page with ?internal=1 — see isInternalTraffic().
const INTERNAL_KEY = "tarefe:internal_traffic";
/** Same 30-minute inactivity rule the dashboard uses to split visits into sessions. */
const VISIT_GAP_MS = 30 * 60 * 1000;


/**
 * The landing classification, read once as soon as this module loads in the
 * browser — BEFORE any consent. It is held in memory only (nothing is written
 * to storage), so a visitor who accepts cookies on page 2 still has the
 * source of page 1. A full page reload re-reads it from the new document, where
 * the referrer is already our own site, so it then falls back to the stored visit.
 */
const landing: Classification | null = typeof window !== "undefined" ? classifySource(window.location.search, document.referrer, window.location.hostname) : null;

/**
 * Team members can opt their own browser out of analytics by opening any
 * page once with ?internal=1 (and back in with ?internal=0). Stored in
 * localStorage; track() then records nothing from that browser.
 */
function isInternalTraffic(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get("internal");
    if (flag === "1") window.localStorage.setItem(INTERNAL_KEY, "1");
    else if (flag === "0") window.localStorage.removeItem(INTERNAL_KEY);
    return window.localStorage.getItem(INTERNAL_KEY) === "1";
  } catch {
    return false;
  }
}

interface StoredVisit {
  snap: UtmSnapshot;
  at: number;
}

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function readStoredUtm(key: string): UtmSnapshot | null {
  return readJson<UtmSnapshot>(window.localStorage, key);
}

/**
 * This visit's classification — computed once per visit and cached for the
 * tab, refreshed after 30 minutes of inactivity. See the file header for the
 * decision order. Also keeps the visitor's first / last-non-direct touch.
 */
function resolveVisit(): UtmSnapshot {
  const now = Date.now();
  const stored = readJson<StoredVisit>(window.sessionStorage, VISIT_KEY);
  const fresh = !!stored && now - stored.at < VISIT_GAP_MS;
  const here = classifySource(window.location.search, document.referrer, window.location.hostname);

  let snap: UtmSnapshot;
  if (here.fromUrl && here.snap) {
    snap = here.snap; // this very URL carries a campaign / click id
  } else if (fresh && stored) {
    snap = stored.snap; // same visit, later page
  } else if (!stored) {
    // First classification in this tab. Prefer what the landing document had at load time.
    const l = landing ?? here;
    if (l.snap) snap = l.snap;
    else if (l.internal) {
      // Opened from one of our own pages in a new tab: continue that visit if it was recent.
      const last = readJson<StoredVisit>(window.localStorage, VISIT_LAST_KEY);
      snap = last && now - last.at < VISIT_GAP_MS ? last.snap : DIRECT;
    } else snap = DIRECT;
  } else {
    snap = DIRECT; // a tab left idle for 30+ minutes and used again: a new visit with no source signal
  }

  try {
    const entry: StoredVisit = { snap, at: now };
    window.sessionStorage.setItem(VISIT_KEY, JSON.stringify(entry));
    window.localStorage.setItem(VISIT_LAST_KEY, JSON.stringify(entry));
    const isDirect = snap.source === DIRECT.source && snap.medium === DIRECT.medium;
    if (!window.localStorage.getItem(UTM_FIRST_KEY)) window.localStorage.setItem(UTM_FIRST_KEY, JSON.stringify(snap));
    if (!isDirect || !window.localStorage.getItem(UTM_LAST_KEY)) window.localStorage.setItem(UTM_LAST_KEY, JSON.stringify(snap));
  } catch {
    // storage unavailable — this visit's attribution just isn't remembered between pages.
  }
  return snap;
}

/** Visit / first-touch / last-touch snapshots — read by track() and by ConsultationForm (for Lead's own attribution fields). */
export function getAttribution(): { first: UtmSnapshot | null; last: UtmSnapshot | null; visit: UtmSnapshot | null } {
  if (!trackingAllowed()) return { first: null, last: null, visit: null };
  try {
    const visit = resolveVisit();
    return { first: readStoredUtm(UTM_FIRST_KEY) ?? visit, last: readStoredUtm(UTM_LAST_KEY) ?? visit, visit };
  } catch {
    return { first: null, last: null, visit: null };
  }
}

const SESSION_KEY = "tarefe:session_id";

/**
 * `crypto.randomUUID()` throws in a non-secure context (plain HTTP, not
 * HTTPS/localhost) — confirmed directly against the live deployment,
 * which currently has no TLS configured (see session notes). Every real
 * visitor's track() call was silently no-oping because of this: the
 * try/catch below swallowed the TypeError and getSessionId() returned
 * null, which is exactly the same path a genuinely blocked/private-mode
 * localStorage takes — this whole feature never recorded a real visitor,
 * only ever the synthetic events used to verify the endpoint directly.
 * `crypto.getRandomValues()` is on the base Crypto interface, not the
 * secure-context-gated extension, so it works everywhere `crypto` itself
 * does — used here to build an equivalent random v4 UUID by hand.
 */
function randomId(): string {
  if (typeof crypto?.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to the manual path below.
    }
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getSessionId(): string | null {
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (private mode, blocked storage) — tracking
    // just quietly no-ops rather than breaking the page for it.
    return null;
  }
}

/** The actions the all-visitors funnel counts without cookies (see /api/funnel-event). */
const COUNTED_WITHOUT_CONSENT = new Set<string>([EVENT.PAGE_VIEW, EVENT.ENERGY_CALCULATOR_USED, EVENT.TARIFF_CTA_CLICKED, EVENT.CONSULTATION_FORM_STARTED, EVENT.WHATSAPP_CLICKED, EVENT.PHONE_CLICKED]);

/**
 * Counts the action on our own server, cookie-free and for everyone: nothing is
 * stored in the browser and nothing identifies the person (the server keeps only
 * a daily-rotating anonymous hash). The Ads landing pages are counted by their own
 * journey table, so they are left out here.
 */
function countWithoutConsent(name: string, path: string | undefined) {
  try {
    if (!COUNTED_WITHOUT_CONSENT.has(name)) return;
    const p = path ?? window.location.pathname;
    if (p.includes("/landing/")) return;
    const body = JSON.stringify({ name, path: p.slice(0, 300) });
    if (!navigator.sendBeacon?.("/api/funnel-event", new Blob([body], { type: "application/json" }))) {
      fetch("/api/funnel-event", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // counting must never be the reason a real user action fails
  }
}

export function track(name: EventName, props: { path?: string; locale?: string; category?: string; service?: string; metadata?: Record<string, unknown> } = {}) {
  if (isInternalTraffic()) return; // a team member who opted out with ?internal=1
  countWithoutConsent(name, props.path);
  if (!trackingAllowed()) return;

  const sessionId = getSessionId();
  if (!sessionId) return;

  const { first, last, visit } = getAttribution();
  const body = JSON.stringify({
    name,
    sessionId,
    ...props,
    utmFirstSource: first?.source,
    utmFirstMedium: first?.medium,
    utmFirstCampaign: first?.campaign,
    utmFirstTerm: first?.term,
    utmFirstContent: first?.content,
    utmLastSource: last?.source,
    utmLastMedium: last?.medium,
    utmLastCampaign: last?.campaign,
    utmLastTerm: last?.term,
    utmLastContent: last?.content,
    utmVisitSource: visit?.source,
    utmVisitMedium: visit?.medium,
    utmVisitCampaign: visit?.campaign,
    utmVisitTerm: visit?.term,
    utmVisitContent: visit?.content,
  });

  try {
    // sendBeacon survives page unload (important for whatsapp_clicked,
    // which fires right as the browser navigates away to wa.me) and never
    // blocks the action it's attached to. Falls back to fetch where
    // unavailable (older browsers, some in-app webviews).
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
    } else {
      fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Tracking must never be the reason a real user action fails.
  }
}
