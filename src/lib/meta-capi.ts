import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

/**
 * Meta Conversions API (server side, 2026-10-23): sends the Lead event straight from our server to Meta, so a
 * lead is counted even when an ad blocker stopped the browser pixel. Same event id as the browser event, so
 * Meta deduplicates the two.
 *
 * Owner's choices: sent for every lead (not gated on the cookie banner); email and phone go along SHA-256
 * hashed (Meta's required format: trimmed, lower-case email; phone as digits with country code, no + or 00).
 *
 * Configuration (server .env, never in git):
 *   META_CAPI_TOKEN       access token from Meta Events Manager → the dataset → Settings → Conversions API
 *   META_TEST_EVENT_CODE  optional: "TEST12345" while testing in Events Manager → Test events (remove after)
 *   META_GRAPH_VERSION    optional, default below
 * Missing pixel id or token = nothing is sent. Failures are logged (never the token) and never block a lead.
 */
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** German numbers as stored by the lead form (01…, 0049…, +49…) → 49… digits, which is what Meta expects. */
export function normalizePhoneForMeta(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `49${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

/**
 * Click id fallback: when an ad blocker stopped the pixel, there is no _fbc cookie, but the page the form was
 * sent from may still carry Meta's ?fbclid=… from the ad click. Meta's documented format: fb.1.<ms>.<fbclid>.
 */
function fbcFromUrl(url: string): string | undefined {
  try {
    const fbclid = new URL(url).searchParams.get("fbclid");
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  } catch {
    return undefined;
  }
}

export type MetaLeadInput = {
  eventId: string;
  eventSourceUrl: string;
  ip: string;
  userAgent: string | null;
  cookieHeader: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string;
  lastName?: string;
  category?: string | null;
  service?: string | null;
};

export async function sendMetaLead(input: MetaLeadInput): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!META_PIXEL_ID || !token) return;

  const phone = input.phone ? normalizePhoneForMeta(input.phone) : null;
  const userData: Record<string, unknown> = {
    client_ip_address: input.ip !== "unknown" ? input.ip : undefined,
    client_user_agent: input.userAgent ?? undefined,
    fbp: readCookie(input.cookieHeader, "_fbp"),
    fbc: readCookie(input.cookieHeader, "_fbc") ?? fbcFromUrl(input.eventSourceUrl),
    em: input.email ? [sha256(input.email.trim().toLowerCase())] : undefined,
    ph: phone ? [sha256(phone)] : undefined,
    fn: input.firstName ? [sha256(input.firstName.trim().toLowerCase())] : undefined,
    ln: input.lastName ? [sha256(input.lastName.trim().toLowerCase())] : undefined,
    country: [sha256("de")],
  };

  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        user_data: userData,
        custom_data: { content_category: input.category ?? undefined, content_name: input.service ?? undefined },
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 300).replaceAll(token, "[token]");
      console.warn(`[meta-capi] Lead not accepted: HTTP ${res.status} ${text}`);
    }
  } catch (error) {
    console.warn(`[meta-capi] Lead not sent: ${error instanceof Error ? error.name : "error"}`);
  }
}
