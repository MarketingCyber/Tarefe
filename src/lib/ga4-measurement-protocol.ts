/**
 * Server-side GA4 event sending, direct to Google's own Measurement
 * Protocol endpoint — NOT routed through sgtm.tarefe.de. Built to fix a
 * real gap: GtmScript.tsx only loads the client-side GTM container after
 * a visitor explicitly accepts the cookie banner (plus a 3s delay), so a
 * visitor who converts before that — or never opens the banner at all —
 * was never counted, even though submitting the lead form itself doesn't
 * depend on GTM. This call is independent of whether the browser ever
 * loaded any tracking script.
 *
 * sgtm.tarefe.de was tried first (keeps hits first-party) and rejects
 * direct backend-to-container Measurement Protocol calls with an
 * unexplained 400 even hitting the Docker container directly, bypassing
 * Nginx/TLS entirely — ruled out stale config (restarted the container),
 * payload format, and client_id format. The exact same payload succeeds
 * (204) against Google's own endpoint, confirming the secret and format
 * are correct and the problem is specific to our container. Not worth
 * more time chasing an undocumented rejection when the direct endpoint
 * already fully solves the actual problem (see AGENTS.md-adjacent
 * decision, 2026-09-28) — sgtm.tarefe.de keeps doing its real job:
 * proxying client-side hits for visitors who *do* consent, where it
 * gives ad-blocker resistance and a durable first-party cookie.
 *
 * Consent: gated on the SAME "accepted" value GtmScript.tsx checks
 * (see cookie-consent.ts) — sending server-side removes the *technical*
 * dependency on the script loading in time, not the legal requirement
 * for the visitor to have actually consented. Consent lives in
 * localStorage (client-only), so the caller reads it and passes
 * `consentAccepted` through — the server can't read it directly.
 */

const MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";

/** Matches the client_id portion of a real `_ga` cookie value, e.g. "GA1.1.123456789.987654321" -> "123456789.987654321". */
const GA_COOKIE_CLIENT_ID = /^GA\d\.\d\.(\d+\.\d+)$/;

export function extractGaClientId(gaCookieValue: string | undefined | null): string | null {
  if (!gaCookieValue) return null;
  const m = GA_COOKIE_CLIENT_ID.exec(gaCookieValue.trim());
  return m ? m[1] : null;
}

export async function sendGA4Event(params: {
  clientId: string;
  eventName: string;
  eventParams?: Record<string, string | number | boolean>;
  userAgent?: string;
  ipOverride?: string;
}): Promise<void> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_MP_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const url = new URL(MP_ENDPOINT);
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", apiSecret);

  const body: Record<string, unknown> = {
    client_id: params.clientId,
    events: [{ name: params.eventName, params: params.eventParams ?? {} }],
  };
  if (params.ipOverride) body.ip_override = params.ipOverride;

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(params.userAgent ? { "User-Agent": params.userAgent } : {}),
      },
      body: JSON.stringify(body),
    });
    // GA4 MP returns 204 on success with an empty body — never throws on a
    // bad request, so a failure here is silent unless checked explicitly.
    // Logged (not thrown) so a broken secret/measurement id shows up in
    // `pm2 logs` instead of silently losing every server-side event —
    // never lets it affect the request this is attached to either way.
    if (!res.ok) console.error(`[ga4-measurement-protocol] ${params.eventName} rejected: HTTP ${res.status}`);
  } catch (e) {
    console.error(`[ga4-measurement-protocol] ${params.eventName} failed:`, e);
  }
}
