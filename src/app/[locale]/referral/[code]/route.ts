import { NextResponse } from "next/server";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS, cleanReferralCode } from "@/lib/referral-code";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/taxonomy";

/**
 * A customer's share link, tarefe.de/referral/<code> — the form the old site used, so links customers already shared
 * keep working (the proxy adds the language: /fa/referral/<code>). Remembers the code for a sign-up or a request on
 * the site (lib/referral.ts) and opens the home page, tagged as referral traffic for the analytics.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale: rawLocale, code: rawCode } = await params;
  const locale: Locale = LOCALES.includes(rawLocale as Locale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
  // A relative Location: behind the web server the app only knows its internal address (an absolute URL built
  // from the request pointed visitors at https://0.0.0.0:3000 — seen live 2026-11-14).
  const query = new URLSearchParams({ utm_source: "referral", utm_medium: "referral", utm_campaign: "customer-referral" });
  const response = new NextResponse(null, { status: 302, headers: { Location: `/${locale}?${query}` } });

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
