import type { Locale } from "@/lib/taxonomy";
import { prisma } from "@/lib/db";
import { ReviewSlider, type ReviewItem } from "@/components/shared/ReviewSlider";

/**
 * Real customer comments (the published Testimonial rows) as a manual slider, for pages that have no comments
 * of their own (the electricity and gas pages). Renders nothing while the table is empty, so a page never shows
 * an invented or placeholder review. German and Russian fall back to the Persian original when a translation
 * is missing; names on non-Persian pages are the Latin spelling.
 */
const COPY: Record<Locale, { title: string; sub: string; translated: string }> = {
  fa: { title: "مشتریان ما چه می‌گویند", sub: "تجربه‌های واقعی مشتریان تعرفه.", translated: "" },
  de: { title: "Das sagen unsere Kunden", sub: "Echte Erfahrungen unserer Kunden mit Tarefe.", translated: "Aus dem Persischen übersetzt" },
  ru: { title: "Что говорят наши клиенты", sub: "Реальные отзывы клиентов Tarefe.", translated: "Перевод с персидского" },
};

export async function CustomerReviews({ locale }: { locale: Locale }) {
  const rows = await prisma.testimonial.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  if (rows.length === 0) return null;
  const items: ReviewItem[] = rows.map((t) => ({
    id: t.id,
    title: (locale === "de" ? t.serviceLabelDe : locale === "ru" ? t.serviceLabelRu : null) ?? t.serviceLabel ?? undefined,
    quote: (locale === "de" ? t.quoteDe : locale === "ru" ? t.quoteRu : null) ?? t.quoteFa,
    name: locale === "fa" ? t.customerName : (t.customerNameLatin ?? t.customerName),
  }));
  const c = COPY[locale];
  return (
    <section className="border-t border-border bg-tint py-14 md:py-16">
      <div className="container-page">
        <ReviewSlider
          locale={locale}
          items={items}
          header={
            <>
              <h2 className="text-xl font-bold text-purple-900 md:text-2xl">{c.title}</h2>
              <p className="mt-2 max-w-[56ch] text-sm text-secondary">{c.sub}</p>
            </>
          }
        />
        {locale !== "fa" && <p className="mt-3 text-center text-xs text-secondary">{c.translated}</p>}
      </div>
    </section>
  );
}
