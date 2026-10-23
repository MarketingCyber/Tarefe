import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, LOCALE_DIR, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { inter, iransansx } from "@/lib/fonts";
import { Navbar } from "@/components/layout/Navbar";
import { FreeBar } from "@/components/layout/FreeBar";
import { Footer } from "@/components/layout/Footer";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PageViewTracker } from "@/components/providers/PageViewTracker";
import { WebVitalsReporter } from "@/components/providers/WebVitalsReporter";
import { CookieConsentBanner } from "@/components/shared/CookieConsentBanner";
import { GtmScript } from "@/components/providers/GoogleTagManager";
import { MetaPixel } from "@/components/providers/MetaPixel";
import { PageTransition } from "@/components/providers/PageTransition";
import "../globals.css";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) return {};
  const dict = getDictionary(locale as Locale);
  return {
    title: { default: dict.home.heroTitle, template: `%s | Tarefe` },
    description: dict.home.heroSubtitle,
    metadataBase: new URL("https://tarefe.de"),
    // Deliberately no `alternates` default here — it would apply the same
    // (wrong) canonical/hreflang to every page. Each page computes its own
    // via buildAlternates() from its real path. See src/lib/seo.ts.
    openGraph: {
      siteName: "Tarefe",
      locale,
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!LOCALES.includes(rawLocale as Locale)) notFound();
  const locale = rawLocale as Locale;
  const dict = getDictionary(locale);
  const dir = LOCALE_DIR[locale];

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${iransansx.variable}`} suppressHydrationWarning>
      <GtmScript />
      <MetaPixel />
      <body className="flex min-h-screen flex-col antialiased selection:bg-purple-600/15">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-purple-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          {locale === "fa" ? "رفتن به محتوای اصلی" : locale === "de" ? "Zum Hauptinhalt springen" : "Перейти к основному содержанию"}
        </a>
        <OrganizationSchema />
        <PageViewTracker locale={locale} />
        <WebVitalsReporter locale={locale} />
        <SessionProvider>
          <FreeBar dict={dict} />
          <Navbar locale={locale} dict={dict} />
          <main id="main-content" className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer locale={locale} dict={dict} />
        </SessionProvider>
        <CookieConsentBanner locale={locale} label={dict.cookieConsent} />
      </body>
    </html>
  );
}
