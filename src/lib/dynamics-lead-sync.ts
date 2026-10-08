/**
 * Forwards every new Lead to the self-hosted CRM at api.tarefe.de
 * (internally "Dynamics" per the business, reachable externally — see
 * 2026-10 conversation) via its documented REST API (client_credentials
 * OAuth2, then POST /api/v1/lead/create). Same contract as
 * ga4-measurement-protocol.ts: best-effort, never throws, never blocks or
 * fails the actual lead save in our own DB — a visitor's submission
 * succeeding must never depend on a third-party CRM being reachable.
 *
 * Token caching: the access_token is long-lived (~6 months per
 * `expire_in` in real responses, 2026-10-06 test call), so it's cached in
 * module scope rather than re-fetched per lead — this process runs under
 * PM2 as a single long-lived Node process, so an in-memory cache persists
 * correctly across requests (would NOT be safe in a serverless/edge
 * runtime that cold-starts per request).
 */

import { TAXONOMY, byLocale, type Locale } from "./taxonomy";

function apiBase(): string {
  return process.env.DYNAMICS_API_BASE ?? "https://api.tarefe.de";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.DYNAMICS_CLIENT_ID;
  const clientSecret = process.env.DYNAMICS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // 5-minute safety margin, not the exact expiry instant — avoids a
  // request firing with a token that expires mid-flight.
  if (cachedToken && cachedToken.expiresAt - Date.now() > 5 * 60 * 1000) {
    return cachedToken.value;
  }

  const res = await fetch(`${apiBase()}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string; expire_in: string };
  cachedToken = { value: data.access_token, expiresAt: new Date(data.expire_in).getTime() };
  return cachedToken.value;
}

/**
 * Resolves a human-readable service label from the same category/
 * serviceSlug already stored on the Lead — looked up fresh each call
 * rather than stored, so it always matches the taxonomy's current
 * wording. `serviceSlug` may match either a subcategory (collapsed PLPs,
 * productType.slug === "") or a real productType — see taxonomy.ts's own
 * URL-depth comment for why both shapes exist.
 */
function resolveTopic(category: string | null | undefined, serviceSlug: string | null | undefined, locale: Locale): string | undefined {
  if (!category) return undefined;
  const cat = TAXONOMY.find((c) => c.slug === category);
  if (!cat) return undefined;
  if (!serviceSlug) return byLocale(locale, cat.title);
  for (const sub of cat.subcategories) {
    if (sub.slug === serviceSlug) return byLocale(locale, sub.title);
    const productType = sub.productTypes.find((p) => p.slug === serviceSlug);
    if (productType) return byLocale(locale, productType.title);
  }
  return byLocale(locale, cat.title);
}

export async function syncLeadToDynamics(lead: {
  // Real separate given/family names from the form (2026-10-07) — not
  // derived from a combined name. See LeadSchema in api/leads/route.ts's
  // own comment for why: sending the whole name as firstName with an
  // empty/null lastName triggered their system's own placeholder lastName
  // ("بدون نام خانوادگی") on every synced lead, confirmed on 2026-10-07 —
  // tried null, tried "", tried a heuristic split, all rejected or
  // ineffective. A real lastName from the form is the only thing that
  // actually avoids it.
  firstName: string;
  lastName: string;
  // string | null, not string — Lead.phone stays nullable at the DB level
  // for historical rows from before phone became required (see schema.prisma's
  // own comment on Lead.phone), even though every NEW lead through
  // /api/leads is guaranteed to have one by that route's own Zod schema.
  phone: string | null;
  email?: string | null;
  category?: string | null;
  serviceSlug?: string | null;
  sourcePage?: string | null;
  locale: Locale;
  utmLastSource?: string | null;
  utmLastMedium?: string | null;
  utmLastCampaign?: string | null;
  utmLastTerm?: string | null;
  utmLastContent?: string | null;
}): Promise<void> {
  // Not configured — a silent no-op, not an error; lets this stay
  // harmless in any environment (local dev, a future staging env) that
  // doesn't have the credentials set.
  if (!process.env.DYNAMICS_CLIENT_ID) return;
  // mobile is required by their API — a lead with no phone (only possible
  // for historical rows predating the required-phone change) has nothing
  // valid to send.
  if (!lead.phone) return;

  try {
    const token = await getAccessToken();
    if (!token) return;

    // Query-string UTMs, last-touch (not first-touch) — reflects the
    // campaign that actually drove THIS conversion, which is what their
    // sales/attribution side wants, per 2026-10 conversation.
    const params = new URLSearchParams();
    if (lead.utmLastSource) params.set("utm_source", lead.utmLastSource);
    if (lead.utmLastMedium) params.set("utm_medium", lead.utmLastMedium);
    if (lead.utmLastCampaign) params.set("utm_campaign", lead.utmLastCampaign);
    if (lead.utmLastContent) params.set("utm_content", lead.utmLastContent);
    if (lead.utmLastTerm) params.set("utm_term", lead.utmLastTerm);

    const topic = resolveTopic(lead.category, lead.serviceSlug, lead.locale);
    // "the directory which lead submission has happened" — their own
    // suggestion was utm_content, but that field is meant for real ad
    // creative/content tags; description keeps the two honest instead of
    // overwriting real campaign data with a page path.
    const description = lead.sourcePage ? `ثبت‌شده از صفحه: ${lead.sourcePage}` : undefined;

    const res = await fetch(`${apiBase()}/api/v1/lead/create?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        // No per-category serviceId mapping exists yet on their side — 0
        // is their own documented "general lead" fallback (lead-create.txt),
        // not a guess. Revisit once that mapping exists.
        serviceId: 0,
        mobile: lead.phone,
        firstName: lead.firstName,
        lastName: lead.lastName,
        ...(lead.email ? { email: lead.email } : {}),
        ...(topic ? { topic } : {}),
        ...(description ? { description } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`[dynamics-lead-sync] rejected: HTTP ${res.status} ${await res.text()}`);
    }
  } catch (e) {
    console.error("[dynamics-lead-sync] failed:", e);
  }
}
