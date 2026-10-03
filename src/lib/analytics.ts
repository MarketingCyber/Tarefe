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
 * track() only fires with cookie-consent's "accepted" state (see
 * src/lib/cookie-consent.ts) — this module writes a session id to
 * localStorage, which needs opt-in consent under TTDSG same as a tracking
 * cookie would, and the default (no consent recorded yet) blocks it.
 */
import { getConsent } from "./cookie-consent";

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
 * Two snapshots, both read from the same five UTM params:
 *  - "first": written once, the first time this browser ever carries UTM
 *    params, never overwritten after — "what channel actually brought this
 *    person to us", survives a return visit weeks later via a bookmark.
 *  - "last": overwritten every time a new visit carries UTM params —
 *    "what was the most recent campaign that drove this action", the model
 *    paid-ads platforms use for conversion attribution.
 * Same consent gate as sessionId below: only captured once cookie consent
 * is "accepted" (TTDSG), so pre-consent campaign visits legitimately go
 * unattributed — an accepted limitation, not a bug.
 */
export interface UtmSnapshot {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

const UTM_FIRST_KEY = "tarefe:utm_first";
const UTM_LAST_KEY = "tarefe:utm_last";

function readUtmFromLocation(): UtmSnapshot | null {
  const params = new URLSearchParams(window.location.search);
  const snapshot: UtmSnapshot = {
    source: params.get("utm_source") ?? undefined,
    medium: params.get("utm_medium") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    term: params.get("utm_term") ?? undefined,
    content: params.get("utm_content") ?? undefined,
  };
  return Object.values(snapshot).some(Boolean) ? snapshot : null;
}

function readStoredUtm(key: string): UtmSnapshot | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as UtmSnapshot) : null;
  } catch {
    return null;
  }
}

/** Call on every page view — cheap no-op when the current URL has no UTM params. */
function captureUtm(): void {
  try {
    const fromUrl = readUtmFromLocation();
    if (!fromUrl) return;
    window.localStorage.setItem(UTM_LAST_KEY, JSON.stringify(fromUrl));
    if (!window.localStorage.getItem(UTM_FIRST_KEY)) {
      window.localStorage.setItem(UTM_FIRST_KEY, JSON.stringify(fromUrl));
    }
  } catch {
    // localStorage unavailable — this visit's attribution just isn't captured.
  }
}

/** First-touch and last-touch snapshots as currently stored — read by track() and by ConsultationForm (for Lead's own attribution fields). */
export function getAttribution(): { first: UtmSnapshot | null; last: UtmSnapshot | null } {
  if (getConsent() !== "accepted") return { first: null, last: null };
  captureUtm();
  return { first: readStoredUtm(UTM_FIRST_KEY), last: readStoredUtm(UTM_LAST_KEY) };
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

export function track(name: EventName, props: { path?: string; locale?: string; category?: string; service?: string; metadata?: Record<string, unknown> } = {}) {
  if (getConsent() !== "accepted") return;

  const sessionId = getSessionId();
  if (!sessionId) return;

  const { first, last } = getAttribution();
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
