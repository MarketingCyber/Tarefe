import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { recordLanding } from "@/lib/landing-hits";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/taxonomy";
import { isAppEnabled, isAppPath } from "@/lib/app-flag";

/**
 * Locale redirect proxy (Next.js 16 renamed middleware.ts -> proxy.ts).
 * The site has no bare, unprefixed public routes — every request that
 * doesn't already start with /fa, /de, or /ru gets sent to a locale-prefixed
 * URL, picked from Accept-Language when possible, falling back to Persian.
 *
 * /app/* (customer portal) and /ops/* (internal) are NOT locale-prefixed
 * per the architecture (separate root layouts, separate audiences) and are
 * excluded via the matcher below.
 */
function detectLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") ?? "";
  const preferred = header.split(",").map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase());
  const match = preferred.find((lang) => LOCALES.includes(lang as Locale));
  return (match as Locale) ?? DEFAULT_LOCALE;
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Mobile app back end + its staff pages: 404 until the app is published (lib/app-flag.ts).
  if (isAppPath(pathname)) return isAppEnabled() ? NextResponse.next() : new NextResponse(null, { status: 404 });

  const hasLocale = LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  if (hasLocale) {
    // Cookie-free landing counter (lib/landing-hits.ts): runs after the response is sent, never delays or breaks the page.
    event.waitUntil(recordLanding(request));
    return NextResponse.next();
  }

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Run on every path except:
     *  - /app and /ops (separate, unprefixed root layouts)
     *  - Next internals, static files, and well-known metadata files
     */
    "/((?!app|ops|landing|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
    // The mobile app paths, only so the switch above can close them (lib/app-flag.ts).
    "/api/v1/:path*",
    "/ops/conversations/:path*",
    "/ops/app-banners/:path*",
  ],
};
