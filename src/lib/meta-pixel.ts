import { adsAllowed } from "@/lib/cookie-consent";

/**
 * Meta (Facebook/Instagram) tracking, browser side. Since 2026-10-24 the Pixel itself lives in Google Tag Manager
 * (GTM-M2LGN5WC), not in this code: tag "Meta Pixel - base" loads it on every page (init only), and the event tags
 * send what this file pushes to the dataLayer:
 *   meta_pageview    → "Meta Pixel - PageView"     (every page, incl. client-side navigation; since 2026-10-30)
 *   meta_viewcontent → "Meta Pixel - ViewContent"  (energy landing pages and service pages; since 2026-10-30)
 *   meta_lead        → "Meta Pixel - Lead"
 * Every event also goes to Meta from the server (src/lib/meta-capi.ts, Conversions API) with the SAME event id,
 * so Meta counts it once (deduplication) and still sees it when the browser pixel is blocked.
 * All of it follows the "ads" switch in the cookie settings (on by default, owner's decision 2026-10-29).
 *
 * The Pixel ID is public (it is visible in every page that loads the pixel), like the GTM container id; the
 * server's Conversions API call uses it from here. The access token is a secret and lives only in the server's .env.
 */
export const META_PIXEL_ID = "1440924411342428";

/** One id per event, shared by the browser event and the server event. */
export function newMetaEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pushToDataLayer(entry: Record<string, unknown>) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(entry);
}

/** Server half of a browser event: a beacon to our own /api/meta-event, which forwards it to the Conversions API. */
function sendServerEvent(eventName: "PageView" | "ViewContent", eventId: string, content?: { category: string; name: string }) {
  const body = JSON.stringify({ eventName, eventId, url: window.location.href, ...(content ? { category: content.category, name: content.name } : {}) });
  try {
    if (navigator.sendBeacon?.("/api/meta-event", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/meta-event", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

/** What a page is "about" for ViewContent: the energy landing pages and the service pages, nothing else. */
export function metaContentFor(pathname: string): { category: string; name: string } | null {
  const parts = pathname.split("/").filter(Boolean); // e.g. fa/landing/gas, fa/services/insurance/pkv
  const landing = parts[1] === "landing" ? parts[2] : undefined;
  if (landing === "electricity" || landing === "gas") return { category: "energy", name: landing };
  if (parts[1] === "services" && parts[2]) return { category: parts[2], name: parts[parts.length - 1] };
  return null;
}

/** PageView (+ ViewContent where it applies) for the page just shown, to the Pixel and to the server. */
export function trackMetaPageView(pathname: string) {
  if (typeof window === "undefined" || !adsAllowed()) return;
  const pageId = newMetaEventId();
  pushToDataLayer({ event: "meta_pageview", meta_event_id: pageId });
  sendServerEvent("PageView", pageId);

  const content = metaContentFor(pathname);
  if (!content) return;
  const contentId = newMetaEventId();
  pushToDataLayer({ event: "meta_viewcontent", meta_event_id: contentId, meta_content_category: content.category, meta_content_name: content.name });
  sendServerEvent("ViewContent", contentId, content);
}

/** Browser half of the Lead event: hands it to GTM, whose "Meta Pixel - Lead" tag sends it (no-op if GTM was blocked). */
export function trackMetaLead(eventId: string, data: { category?: string; service?: string }) {
  if (typeof window === "undefined") return;
  pushToDataLayer({ event: "meta_lead", meta_event_id: eventId, meta_content_category: data.category, meta_content_name: data.service });
}
