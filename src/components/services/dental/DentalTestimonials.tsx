import type { Locale } from "@/lib/taxonomy";
import { ReviewSlider, type ReviewItem } from "@/components/shared/ReviewSlider";
import { CUSTOMER_COMMENTS } from "@/lib/customer-comments";

/** Real customer comments on the dental page, as a manual slider (the comments themselves: src/lib/customer-comments.ts). */
type L = Record<Locale, string>;
const t = (fa: string, de: string, ru: string): L => ({ fa, de, ru });


const COPY = {
  title: t("مشتریان ما چه می‌گویند", "Das sagen unsere Kunden", "Что говорят наши клиенты"),
  sub: t("تجربه‌های واقعی مشتریان بیمه دندان تعرفه.", "Echte Erfahrungen unserer Kunden mit der Zahnzusatzversicherung.", "Реальные отзывы клиентов о стоматологической страховке."),
  translated: t("", "Aus dem Persischen übersetzt", "Перевод с персидского"),
};

export function DentalTestimonials({ locale }: { locale: Locale }) {
  const items: ReviewItem[] = CUSTOMER_COMMENTS.map((it) => ({ id: it.id, title: it.title[locale], quote: it.quote[locale], name: it.name[locale] }));
  return (
    <section className="border-t border-border bg-tint py-14 md:py-16">
      <div className="container-page">
        <ReviewSlider
          locale={locale}
          items={items}
          header={
            <>
              <h2 className="text-xl font-bold text-purple-900 md:text-2xl">{COPY.title[locale]}</h2>
              <p className="mt-2 max-w-[56ch] text-sm text-secondary">{COPY.sub[locale]}</p>
            </>
          }
        />
        {locale !== "fa" && <p className="mt-3 text-center text-xs text-secondary">{COPY.translated[locale]}</p>}
      </div>
    </section>
  );
}
