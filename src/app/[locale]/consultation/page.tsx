import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";
import { Reveal } from "@/components/shared/Reveal";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

// Also shown on the page itself, right under the h1 — kept in one place so
// the meta description and the visible copy can't drift apart.
const DESCRIPTION: Record<Locale, string> = {
  fa: "اطلاعات خود را وارد کنید؛ مشاوران ما ظرف کمتر از ۳ ساعت با شما تماس خواهند گرفت.",
  de: "Teilen Sie uns Ihre Daten mit — unsere Berater melden sich innerhalb von 3 Stunden bei Ihnen.",
  ru: "Поделитесь данными — наши консультанты свяжутся с вами в течение 3 часов.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.nav.consultation, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "consultation") };
}

export default async function ConsultationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="container-page py-10 md:py-16">
      <Reveal>
        <Breadcrumbs items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: dict.nav.consultation, href: `/${locale}/consultation` }]} />
      </Reveal>
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <Reveal delay={0.08}>
          <h1 className="text-3xl font-bold text-purple-900 md:text-4xl">{dict.cta.freeConsultation}</h1>
          <p className="mt-3 max-w-[48ch] text-secondary">{DESCRIPTION[locale]}</p>
        </Reveal>
        <Reveal delay={0.16}>
          <ConsultationForm locale={locale} />
        </Reveal>
      </div>
    </div>
  );
}
