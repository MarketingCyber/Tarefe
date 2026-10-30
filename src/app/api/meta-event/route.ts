import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { BOT_UA } from "@/lib/landing-hits";
import { sendMetaPageEvent } from "@/lib/meta-capi";

/**
 * POST /api/meta-event — the server half of the browser's Meta PageView / ViewContent (lib/meta-pixel.ts sends a
 * beacon here with the same event id it gave the pixel). Forwarded to the Conversions API after the answer, so the
 * page never waits; always 204, like the other counting beacons. Only our own pages are accepted as the event URL.
 */
const Body = z.object({
  eventName: z.enum(["PageView", "ViewContent"]),
  eventId: z.string().min(8).max(64),
  url: z.string().url().max(1000),
  category: z.string().max(60).optional(),
  name: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`meta-event:${ip}`, 60).allowed) return new NextResponse(null, { status: 204 });
  const ua = request.headers.get("user-agent") ?? "";
  if (ua.length < 20 || BOT_UA.test(ua)) return new NextResponse(null, { status: 204 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 204 });
  const host = new URL(parsed.data.url).hostname;
  if (host !== new URL(request.url).hostname && host !== "tarefe.de" && host !== "www.tarefe.de") return new NextResponse(null, { status: 204 });

  const cookieHeader = request.headers.get("cookie");
  after(() =>
    sendMetaPageEvent({ ...parsed.data, eventSourceUrl: parsed.data.url, ip, userAgent: ua, cookieHeader }),
  );
  return new NextResponse(null, { status: 204 });
}
