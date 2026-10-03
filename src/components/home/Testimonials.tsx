import { MapPin, Phone, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/db";
import { TrackedPhoneLink } from "@/components/shared/TrackedPhoneLink";
import { TestimonialCarousel, type TestimonialCardData } from "@/components/home/TestimonialCarousel";

/**
 * Formerly showed three fabricated named customers with invented quotes,
 * fake 5-star ratings, and stock avatar photos passed off as real people —
 * fa.tarefe.de itself has no testimonials section, so there was nothing
 * real to reconcile from. Replaced with the one thing that IS real and
 * verifiable: Tarefe's actual office and direct-contact channels, plus an
 * honest "coming soon" note.
 *
 * That promised swap: /ops/testimonials (Phase 9's second CMS content
 * type) lets staff add real, consented customer quotes — once at least
 * one is published, this section shows those instead of the placeholder.
 * First 5 real quotes published 2026-09-11 (provided directly by Tarefe's
 * owner, see each row's consentNote in the DB). Nothing here is seeded or
 * fabricated; an empty table means the honest fallback keeps showing,
 * which is correct, not broken.
 */
const NOTE: Record<Locale, string> = {
  fa: "به‌محض این‌که مشتریان واقعی نظر خود را با ما در میان بگذارند، تجربه‌های واقعی آن‌ها همین‌جا منتشر می‌شود — بدون نظر ساختگی.",
  de: "Sobald echte Kundinnen und Kunden ihr Feedback teilen, veröffentlichen wir es genau hier — keine erfundenen Bewertungen.",
  ru: "Как только реальные клиенты поделятся отзывом, мы опубликуем его здесь — без вымышленных отзывов.",
};

const ADDRESS_LABEL: Record<Locale, string> = {
  fa: "دفتر تعرفه",
  de: "Tarefe-Büro",
  ru: "Офис Tarefe",
};

export async function Testimonials({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const rows = await prisma.testimonial.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  const items: TestimonialCardData[] = rows.map((t) => ({
    id: t.id,
    quote: (locale === "de" ? t.quoteDe : locale === "ru" ? t.quoteRu : null) ?? t.quoteFa,
    // Farsi shows the real name as written; de/ru show the Latin
    // transliteration (a reading aid, not a translation — see the
    // schema's own comment) when staff have set one, falling back to the
    // original rather than showing nothing.
    customerName: locale === "fa" ? t.customerName : (t.customerNameLatin ?? t.customerName),
    serviceLabel: (locale === "de" ? t.serviceLabelDe : locale === "ru" ? t.serviceLabelRu : null) ?? t.serviceLabel,
    rating: t.rating,
  }));

  return (
    <section className="border-t border-border bg-tint py-16 md:py-24">
      <div className="container-page">
        <div className="max-w-[46ch]">
          <h2 className="text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.storiesTitle}</h2>
          {items.length === 0 && <p className="mt-3 text-sm leading-relaxed text-secondary">{NOTE[locale]}</p>}
        </div>

        <div className="mt-10">
          {items.length > 0 ? (
            <TestimonialCarousel locale={locale} items={items} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-purple-600">
                  <MapPin size={18} weight="duotone" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-purple-900">{ADDRESS_LABEL[locale]}</p>
                  <p className="font-latin mt-1 text-xs leading-relaxed text-secondary">Kesselstr. 3, 40221 Düsseldorf</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-purple-600">
                  <Phone size={18} weight="duotone" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-purple-900">{dict.cta.freeConsultation}</p>
                  <TrackedPhoneLink locale={locale} className="font-latin mt-1 block text-xs text-secondary hover:text-purple-600">
                    +49 211 5421 8000
                  </TrackedPhoneLink>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-5 sm:col-span-2">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-purple-600">
                  <WhatsappLogo size={18} weight="fill" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-purple-900">WhatsApp</p>
                  <a
                    href="https://wa.me/4915224318691"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-latin mt-1 block text-xs text-secondary hover:text-purple-600"
                  >
                    +49 152 2431 8691
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
