import { NextResponse } from "next/server";
import { MarketDataError, getMarketSeries } from "@/lib/energy-market-data";
import type { Commodity } from "@/lib/market-series";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/market/electricity | /api/market/gas — the daily wholesale price
 * series (ct/kWh) behind the live chart on the electricity and gas pages.
 * Public, read-only. The data comes from lib/energy-market-data.ts's in-memory
 * cache, so a request never reaches the upstream API; the CDN-style headers
 * below let browsers and any proxy reuse the answer for a few minutes.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ commodity: string }> }) {
  const { commodity } = await params;
  if (commodity !== "electricity" && commodity !== "gas") return NextResponse.json({ error: "Unknown commodity" }, { status: 404 });

  if (!rateLimit(`market:${getClientIp(request)}`, 30).allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const series = await getMarketSeries(commodity as Commodity);
    return NextResponse.json(series, { headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (err) {
    const code = err instanceof MarketDataError ? err.code : "upstream";
    // 503, not 500: the chart treats this as "feed unavailable" and keeps the schematic.
    return NextResponse.json({ error: code }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
