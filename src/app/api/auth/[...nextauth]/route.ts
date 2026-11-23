import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

/**
 * Behind OpenResty (and, for ops.tarefe.de, Cloudflare) the request reaches Next.js as http://0.0.0.0:3000/…, and
 * NextAuth builds its redirects from that — sign-out sent staff to https://0.0.0.0:3000 (2026-11-23). The site is
 * served under more than one host (tarefe.de, ops.tarefe.de), so instead of one fixed AUTH_URL each request gets its
 * public address back from the proxy's X-Forwarded-Host / X-Forwarded-Proto before NextAuth sees it. Only our own
 * hosts are accepted; anything else keeps the request as it came.
 */
const PUBLIC_HOSTS = new Set(["tarefe.de", "www.tarefe.de", "ops.tarefe.de", "localhost:3000", "localhost:3002"]);

function withPublicUrl(req: NextRequest): NextRequest {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  if (!host || !PUBLIC_HOSTS.has(host)) return req;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "http" ? "http" : "https";
  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `${proto}://${host}`);
  return new NextRequest(url, req);
}

export const GET = (req: NextRequest) => handlers.GET(withPublicUrl(req));
export const POST = (req: NextRequest) => handlers.POST(withPublicUrl(req));
