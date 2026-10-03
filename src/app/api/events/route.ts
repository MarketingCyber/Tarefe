import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { EVENT } from "@/lib/analytics";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const KNOWN_EVENTS: Set<string> = new Set(Object.values(EVENT));

/**
 * Declarative validation (Phase 12) — same reasoning as /api/leads.
 * `name` can't be a static z.enum() since KNOWN_EVENTS is derived from
 * EVENT at module load, not a fixed literal list — .refine() against the
 * same Set keeps this route and analytics.ts's EVENT catalog from ever
 * silently drifting apart, same as the original manual check did.
 */
const UtmField = z.string().trim().min(1).max(200).optional();

const EventSchema = z.object({
  name: z.string().refine((n) => KNOWN_EVENTS.has(n), "Unknown event name"),
  sessionId: z.string().trim().min(1).max(100),
  path: z.string().max(500).optional(),
  locale: z.string().optional(),
  category: z.string().max(100).optional(),
  service: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
});

/**
 * Receives events from src/lib/analytics.ts's track(). Deliberately
 * permissive about failure (always cheap, never throws past its own
 * try/catch) since this is fired via sendBeacon from arbitrary client
 * code — a bad event must never surface as a user-visible error for an
 * action that actually succeeded (e.g. a WhatsApp click that worked fine).
 */
export async function POST(request: Request) {
  // Real usage can fire several events per minute (page views, wizard
  // steps); 60/minute per IP is generous for that while still capping a
  // flood-spam script trying to pollute the analytics dashboard. Silent
  // drop, not a loud error — a tracking beacon failing must never look
  // like a real problem to whatever fired it.
  const { allowed } = rateLimit(`events:${getClientIp(request)}`, 60);
  if (!allowed) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const {
    name,
    sessionId,
    path,
    locale,
    category,
    service,
    metadata,
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
  } = parsed.data;

  // Attribute to a signed-in user when one exists, without requiring it —
  // most traffic is anonymous, and that's fine for behavioral analytics.
  const session = await auth().catch(() => null);

  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        sessionId,
        path: path ?? null,
        locale: LOCALES.includes(locale as Locale) ? (locale as Locale) : null,
        category: category ?? null,
        service: service ?? null,
        userId: session?.user?.id ?? null,
        // Same Prisma Json-input structural-typing quirk hit in
        // guide-actions.ts: Record<string, unknown> isn't structurally
        // assignable to InputJsonValue even though the runtime shape is
        // exactly what Json accepts. Narrow, explicit cast, not `any`.
        metadata: metadata as unknown as Prisma.InputJsonValue | undefined,
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
  } catch {
    // Never let a DB hiccup surface to the client for a fire-and-forget beacon.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
