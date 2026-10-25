import type { Metadata } from "next";
import { LOCALES, TAXONOMY, byLocale, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  const categories = TAXONOMY.filter((c) => c.published).map((c) => c.slug);
  return LOCALES.flatMap((locale) => categories.map((service) => ({ locale, service })));
}

const DESCRIPTION: Record<Locale, (serviceLabel: string) => string> = {
  fa: (s) => `درخواست مشاوره رایگان تعرفه برای ${s} — مشاوری فارسی‌زبان تا چند ساعت آینده با شما تماس می‌گیرد.`,
  de: (s) => `Kostenlose Beratungsanfrage von Tarefe für ${s} — ein Berater in Ihrer Sprache meldet sich in den nächsten Stunden.`,
  ru: (s) => `Бесплатная консультация Tarefe по теме «${s}» — консультант на вашем языке свяжется с вами в ближайшие часы.`,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; service: string }> }): Promise<Metadata> {
  const { locale: raw, service } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const category = TAXONOMY.find((c) => c.slug === service);
  const serviceLabel = category ? byLocale(locale, category.title) : service;
  return {
    title: `${dict.nav.consultation} — ${serviceLabel}`,
    description: DESCRIPTION[locale](serviceLabel),
    alternates: buildAlternates(locale, `consultation/${service}`),
  };
}

export default async function ConsultationServicePage({ params }: { params: Promise<{ locale: string; service: string }> }) {
  const { locale: raw, service } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const category = TAXONOMY.find((c) => c.slug === service);
  const serviceLabel = category ? byLocale(locale, category.title) : service;

  return (
    <div className="container-page py-10 md:py-16">
      <Breadcrumbs
        items={[
          { label: dict.breadcrumbHome, href: `/${locale}` },
          { label: dict.nav.consultation, href: `/${locale}/consultation` },
          { label: serviceLabel, href: `/${locale}/consultation/${service}` },
        ]}
      />
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          <h1 className="text-3xl font-bold text-purple-900 md:text-4xl">{dict.cta.freeConsultation}</h1>
          <p className="mt-3 max-w-[48ch] text-secondary">{serviceLabel}</p>
        </div>
        <ConsultationForm locale={locale} serviceLabel={serviceLabel} category={service} />
      </div>
    </div>
  );
}
