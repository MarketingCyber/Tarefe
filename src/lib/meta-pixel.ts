/**
 * Meta (Facebook/Instagram) tracking, browser side. Since 2026-10-24 the Pixel itself lives in Google Tag Manager
 * (GTM-M2LGN5WC), not in this code: tag "Meta Pixel - base" loads it on every page (owner's choice: not gated on
 * the cookie banner, init only), and tag "Meta Pixel - Lead" sends the Lead when this file pushes `meta_lead`.
 * The same Lead also goes to Meta from the server (src/lib/meta-capi.ts) with the SAME event id, so Meta counts it
 * once (deduplication).
 *
 * The Pixel ID is public (it is visible in every page that loads the pixel), like the GTM container id; the
 * server's Conversions API call uses it from here. The access token is a secret and lives only in the server's .env.
 */
export const META_PIXEL_ID = "1440924411342428";

/** One id per lead, shared by the browser event and the server event. */
export function newMetaEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Browser half of the Lead event: hands it to GTM, whose "Meta Pixel - Lead" tag sends it (no-op if GTM was blocked). */
export function trackMetaLead(eventId: string, data: { category?: string; service?: string }) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: "meta_lead", meta_event_id: eventId, meta_content_category: data.category, meta_content_name: data.service });
}
