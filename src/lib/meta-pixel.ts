/**
 * Meta (Facebook/Instagram) tracking, browser side (2026-10-23). Owner's choices: the pixel loads for every
 * visitor (not gated on the cookie banner), and only the Lead event is sent. The same Lead also goes to Meta
 * from the server (src/lib/meta-capi.ts) with the SAME event id, so Meta counts it once (deduplication).
 *
 * The Pixel ID is public (it is visible in every page that loads the pixel), like the GTM container id, so it
 * lives here in code. The Conversions API access token is a secret and lives only in the server's .env.
 * Empty id = Meta tracking switched off everywhere.
 */
export const META_PIXEL_ID = "1440924411342428";

type Fbq = (command: string, ...args: unknown[]) => void;

/** One id per lead, shared by the browser event and the server event. */
export function newMetaEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Browser half of the Lead event. No-op when the pixel isn't configured or was blocked (ad blockers). */
export function trackMetaLead(eventId: string, data: { category?: string; service?: string }) {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  fbq?.("track", "Lead", { content_category: data.category, content_name: data.service }, { eventID: eventId });
}
