import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { BOT_UA, visitorHash } from "@/lib/landing-hits";

/**
 * POST /api/landing-step — counts one step of the Google Ads landing journey.
 * Cookie-free and consent-free by design (the visitors this exists for never
 * touch the cookie banner): nothing is stored on the device, the visitor is the
 * same daily-rotating anonymous hash as LandingHit, and no IP / user agent is
 * stored. Always answers 204 — a counting beacon must never look like an error
 * to the page that sent it.
 */
const Body = z.object({
  kind: z.enum(["electricity", "gas"]),
  step: z.enum(["usage", "results", "tariff", "form", "submitted"]),
  ads: z.boolean().optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`landing-step:${ip}`, 60).allowed) return new NextResponse(null, { status: 204 });
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.length < 20 || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  try {
    await prisma.landingStep.create({ data: { kind: parsed.data.kind, step: parsed.data.step, ads: !!parsed.data.ads, visitor: visitorHash(ip, ua) } });
  } catch {
    // counting must never fail a page
  }
  return new NextResponse(null, { status: 204 });
}
