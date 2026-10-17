import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { BOT_UA, visitorHash } from "@/lib/landing-hits";

/**
 * POST /api/funnel-event — counts one funnel action (calculator used, tariff
 * button clicked, form started …) for EVERY visitor, with or without cookie
 * consent. Like /api/landing-step: nothing is stored on the device, the visitor
 * is the daily-rotating anonymous hash, no IP or user agent is stored, and the
 * answer is always 204 so a counting beacon never looks like an error.
 */
const Body = z.object({
  name: z.enum(["page_view", "energy_calculator_used", "tariff_cta_clicked", "consultation_form_started", "whatsapp_clicked", "phone_clicked"]),
  path: z.string().max(300),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`funnel-event:${ip}`, 60).allowed) return new NextResponse(null, { status: 204 });
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.length < 20 || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  try {
    await prisma.siteEvent.create({ data: { name: parsed.data.name, path: parsed.data.path, visitor: visitorHash(ip, ua) } });
  } catch {
    // counting must never fail a page
  }
  return new NextResponse(null, { status: 204 });
}
