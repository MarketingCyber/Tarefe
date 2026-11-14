import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS, cleanReferralCode } from "@/lib/referral-code";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/taxonomy";

/**
 * A customer's share link, tarefe.de/referral/<code> — the form the old site used, so links customers already shared
 * keep working (the proxy adds the language: /fa/referral/<code>). Remembers the code for a sign-up or a request on
 * the site (lib/referral.ts) and opens the home page, tagged as referral traffic for the analytics.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale: rawLocale, code: rawCode } = await params;
  const locale: Locale = LOCALES.includes(rawLocale as Locale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
  // Built from nextUrl (the public host behind the web server), like the proxy's own redirects.
  const target = request.nextUrl.clone();
  target.pathname = `/${locale}`;
  target.search = "";
  target.searchParams.set("utm_source", "referral");
  target.searchParams.set("utm_medium", "referral");
  target.searchParams.set("utm_campaign", "customer-referral");
  const response = NextResponse.redirect(target, 302);

  const code = cleanReferralCode(decodeURIComponent(rawCode));
  if (code) {
    response.cookies.set(REFERRAL_COOKIE, code, {
      maxAge: REFERRAL_COOKIE_DAYS * 86400,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
