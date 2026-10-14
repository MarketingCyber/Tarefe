import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendGA4Event } from "@/lib/ga4-measurement-protocol";
import { syncLeadToDynamics } from "@/lib/dynamics-lead-sync";
import { isBotUserAgent, isTorExit, verifyFormToken } from "@/lib/lead-guard";
import { isGermanPhone, toAsciiDigits } from "@/lib/phone";

/**
 * Declarative validation (Phase 12) — this route previously hand-checked
 * each field with `typeof x !== "string"` chains (functionally fine, but
 * every new field meant another manual branch, and the error messages
 * were whatever we remembered to write). Zod makes the actual contract
 * legible in one place and gives consistent, real field-level errors.
 * `locale` deliberately stays outside the schema's own validation — it
 * has a real fallback ("fa") rather than being rejectable, matching how
 * it's always been handled here.
 */
const UtmField = z.string().trim().min(1).max(200).optional();

const LeadSchema = z.object({
  // Split at the form level (2026-10-07) — the CRM sync needs real,
  // separate given/family names rather than the combined string we used
  // to send as firstName with an empty lastName (which triggered their
  // system's own placeholder lastName). Combined back into one `name`
  // for our own Lead.name column below, so nothing else reading it needs
  // to change.
  firstName: z.string().trim().min(1, "first name is required").max(100),
  lastName: z.string().trim().min(1, "last name is required").max(100),
  // Phone is now the required contact method (2026-10-01) — it's how
  // leads actually get contacted (WhatsApp), so it's the one thing the
  // form can't be submitted without; email stays collectable but optional.
  // German mobile numbers only (01…, 0049…, +49…, each with its own exact digit
  // count) — see lib/phone.ts. Persian/Arabic digits are converted to 0-9 first, so
  // what is stored and sent to the CRM is always plain digits.
  phone: z
    .string()
    .trim()
    .min(5, "phone is required")
    .max(50)
    .transform(toAsciiDigits)
    .refine(isGermanPhone, "phone must be a German mobile number: 01… (11-12 digits), or +49/0049… followed by 10-11 digits"),
  email: z.union([z.literal(""), z.email("Invalid email address")]).optional(),
  category: z.string().max(100).optional(),
  serviceSlug: z.string().max(100).optional(),
  sourcePage: z.string().max(500).optional(),
  locale: z.string().optional(),
  // See src/lib/analytics.ts's getAttribution() for what first/last mean.
  utmFirstSource: UtmField,
  utmFirstMedium: UtmField,
  utmFirstCampaign: UtmField,
  utmFirstTerm: UtmField,
  utmFirstContent: UtmField,
  utmLastSource: UtmField,
  utmLastMedium: UtmField,
  utmLastCampaign: UtmField,
  utmLastTerm: UtmField,
  utmLastContent: UtmField,
  // See src/lib/ga4-measurement-protocol.ts's own comment for the full
  // "why" — sending server-side so a lead form submission is counted even
  // when the consent-gated client GTM script never loaded in time.
  // consentAccepted mirrors cookie-consent.ts's getConsent() === "accepted"
  // (localStorage-only, unreadable server-side, so the client passes it).
  gaClientId: z.string().trim().max(100).optional(),
  consentAccepted: z.boolean().optional(),
  // Anti-abuse (see lib/lead-guard.ts). `website` is the honeypot — a field
  // real visitors never see or fill. `formToken` comes from GET /api/leads/token.
  website: z.string().max(500).optional(),
  formToken: z.string().max(300).optional(),
});

/**
 * Rejected-as-bot submissions get a normal-looking 201 and are simply not
 * saved or synced: a bot that sees an error adapts, one that sees success
 * moves on. Only used for signals that cannot come from a real visitor
 * (bot user agent, filled honeypot, replayed token) — never for anything
 * a legitimate browser could trip, which gets an honest error instead.
 */
function pretendAccepted(reason: string, ip: string) {
  console.warn(`[lead-guard] dropped lead (${reason}) ip=${ip}`);
  return NextResponse.json({ id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}` }, { status: 201 });
}

/**
 * What the ConsultationForm now actually submits to — the missing link
 * that closes the "Consultation Flow" loop from Phase 2 §12. Every
 * submission becomes a real Lead row instead of dead-ending on a success
 * page with nowhere for the data to go.
 */
export async function POST(request: Request) {
  // Public, unauthenticated, writes to the DB — the exact shape of
  // endpoint scripted abuse targets (flooding /ops/leads with junk).
  // 5/minute per IP is generous for a real person filling out one form,
  // hostile to a script submitting hundreds.
  const { allowed } = rateLimit(`leads:${getClientIp(request)}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const ip = getClientIp(request);
  if (isBotUserAgent(request.headers.get("user-agent"))) return pretendAccepted("bot user agent", ip);
  // Tor exits are where the 2026-10 flood came from; a real visitor who is
  // blocked still sees the form's error text, which points at WhatsApp.
  if (await isTorExit(ip)) {
    console.warn(`[lead-guard] blocked Tor exit ip=${ip}`);
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const {
    firstName,
    lastName,
    phone,
    email,
    category,
    serviceSlug,
    sourcePage,
    locale,
    utmFirstSource,
    utmFirstMedium,
    utmFirstCampaign,
    utmFirstTerm,
    utmFirstContent,
    utmLastSource,
    utmLastMedium,
    utmLastCampaign,
    utmLastTerm,
    utmLastContent,
    gaClientId,
    consentAccepted,
    website,
    formToken,
  } = parsed.data;

  if (website) return pretendAccepted("honeypot filled", ip);
  const tokenResult = verifyFormToken(formToken);
  if (tokenResult === "replayed" || tokenResult === "too_fast") return pretendAccepted(`token ${tokenResult}`, ip);
  if (tokenResult !== "ok") {
    // missing / invalid / expired: could be a bot, or a visitor on a stale cached page — be honest so the form can retry.
    console.warn(`[lead-guard] rejected lead (token ${tokenResult}) ip=${ip}`);
    return NextResponse.json({ error: "Please reload the page and try again", code: "form_token" }, { status: 400 });
  }

  const resolvedLocale: Locale = LOCALES.includes(locale as Locale) ? (locale as Locale) : "fa";
  const name = `${firstName} ${lastName}`.trim();

  const lead = await prisma.lead.create({
    data: {
      name,
      phone,
      email: email && email.length > 0 ? email : null,
      category: category ?? null,
      serviceSlug: serviceSlug ?? null,
      sourcePage: sourcePage ?? null,
      locale: resolvedLocale,
      utmFirstSource: utmFirstSource ?? null,
      utmFirstMedium: utmFirstMedium ?? null,
      utmFirstCampaign: utmFirstCampaign ?? null,
      utmFirstTerm: utmFirstTerm ?? null,
      utmFirstContent: utmFirstContent ?? null,
      utmLastSource: utmLastSource ?? null,
      utmLastMedium: utmLastMedium ?? null,
      utmLastCampaign: utmLastCampaign ?? null,
      utmLastTerm: utmLastTerm ?? null,
      utmLastContent: utmLastContent ?? null,
    },
  });

  await prisma.activityLog.create({
    data: {
      entityType: "lead",
      entityId: lead.id,
      action: "created",
      note: "Submitted via consultation form",
      leadId: lead.id,
    },
  });

  // Best-effort, never blocks or fails the lead response — see
  // ga4-measurement-protocol.ts's comment for the full architecture.
  if (consentAccepted && gaClientId) {
    await sendGA4Event({
      clientId: gaClientId,
      eventName: "generate_lead",
      userAgent: request.headers.get("user-agent") ?? undefined,
      ipOverride: getClientIp(request),
    });
  }

  // Same best-effort contract — see dynamics-lead-sync.ts's own comment.
  // Real separate firstName/lastName from the form, not re-derived from
  // the combined lead.name — see LeadSchema's own comment above.
  await syncLeadToDynamics({
    firstName,
    lastName,
    phone: lead.phone,
    email: lead.email,
    category: lead.category,
    serviceSlug: lead.serviceSlug,
    sourcePage: lead.sourcePage,
    locale: resolvedLocale,
    utmLastSource: lead.utmLastSource,
    utmLastMedium: lead.utmLastMedium,
    utmLastCampaign: lead.utmLastCampaign,
    utmLastTerm: lead.utmLastTerm,
    utmLastContent: lead.utmLastContent,
  });

  return NextResponse.json({ id: lead.id }, { status: 201 });
}
