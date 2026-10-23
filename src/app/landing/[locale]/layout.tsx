import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, LOCALE_DIR, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { inter, iransansx } from "@/lib/fonts";
import { PageViewTracker } from "@/components/providers/PageViewTracker";
import { CookieConsentBanner } from "@/components/shared/CookieConsentBanner";
import { GtmScript } from "@/components/providers/GoogleTagManager";
import { MetaPixel } from "@/components/providers/MetaPixel";
import "../../globals.css";

/**
 * Root layout of the Google Ads landing journey (/fa/landing/gas, /fa/landing/electricity).
 * Its own root — like /app and /ops — so these pages carry NONE of the site's chrome (no menu,
 * no footer links): a paid-traffic visitor gets one path and nowhere to wander. The public URL
 * keeps its locale prefix; next.config.ts rewrites /:locale/landing/:kind to /landing/:locale/:kind.
 *
 * What stays: the Tag Manager container (the Google Ads conversion is the lead form, tracked by
 * it), the consent banner and the page-view tracker — same as every public page.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  // Ad landing pages must not compete with the real service pages in search.
  robots: { index: false, follow: false },
  metadataBase: new URL("https://tarefe.de"),
};

export default async function LandingLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!LOCALES.includes(rawLocale as Locale)) notFound();
  const locale = rawLocale as Locale;
  const dict = getDictionary(locale);

  return (
    <html lang={locale} dir={LOCALE_DIR[locale]} className={`${inter.variable} ${iransansx.variable}`} suppressHydrationWarning>
      <GtmScript />
      <MetaPixel />
      <body className="min-h-screen bg-white antialiased selection:bg-purple-600/15">
        <PageViewTracker locale={locale} />
        {children}
        <CookieConsentBanner locale={locale} label={dict.cookieConsent} />
      </body>
    </html>
  );
}
