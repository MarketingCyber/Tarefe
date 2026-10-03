import Link from "next/link";
import { Tooth, HeartStraight, Lightning, Fire } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import { byLocale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";

// "note" carries a specific price only for the two services with a real,
// data-backed tariff (see pdp-data.ts — must match KNOWN_TARIFFS exactly).
// The other four used to show invented "from X€" figures with nothing
// behind them; replaced with an honest, non-numeric line until real
// tariffs are reconciled for those categories too.
const GENERIC_NOTE = { fa: "مقایسه رایگان و شفاف", de: "Kostenloser, transparenter Vergleich", ru: "Бесплатное прозрачное сравнение" };

const ITEMS = (locale: Locale) => [
  { href: `/${locale}/services/insurance/health/pkv`, icon: HeartStraight, title: byLocale(locale, { fa: "بیمه خصوصی درمان", de: "Private Krankenversicherung", ru: "Частная медстраховка" }), note: byLocale(locale, GENERIC_NOTE) },
  { href: `/${locale}/services/insurance/health/dental`, icon: Tooth, title: byLocale(locale, { fa: "بیمه دندان", de: "Zahnzusatzversicherung", ru: "Стоматологическая страховка" }), note: byLocale(locale, { fa: "از ۲۴€ / ماه", de: "ab 24 €/Monat", ru: "от 24 €/мес" }) },
  { href: `/${locale}/services/energy/electricity`, icon: Lightning, title: byLocale(locale, { fa: "برق سبز خانگی", de: "Ökostrom", ru: "Зелёное электричество" }), note: byLocale(locale, { fa: "تا ۱۵۰€ بونوس", de: "bis 150 € Bonus", ru: "до 150 € бонус" }) },
  { href: `/${locale}/services/energy/gas`, icon: Fire, title: byLocale(locale, { fa: "گاز طبیعی", de: "Erdgas", ru: "Природный газ" }), note: byLocale(locale, GENERIC_NOTE) },
  // Communication (internet/mobile) items removed — the category is
  // unpublished, see taxonomy.ts.
];

export function PopularServices({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="border-t border-border py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.popularTitle}</h2>

        {/* A plain responsive grid, not a horizontal-scroll row — a scroll
            row hides most of the 4 items behind a swipe gesture nobody is
            cued to make on desktop, and a hard-cropped edge card reads as
            "that's everything" rather than "more here." A grid shows every
            item at once at every width, needs no JS, and matches the same
            card language as ServiceCategories/WhyTarefe above it. */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ITEMS(locale).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600">
                  <Icon size={20} weight="duotone" />
                </span>
                <span className="text-sm font-semibold text-purple-900">{item.title}</span>
                {/* No .font-latin here — unlike MyTarefePreview's "72€ / mo"
                    (genuinely Latin-only), this note is Persian prose that
                    happens to contain a price (already in Persian-Eastern
                    digits, "۲۴€", not Latin ones). Forcing the whole span
                    into the Latin font was rendering real Persian words in
                    the wrong typeface. German/Russian already get the
                    Latin font at the body level, so dropping the class
                    changes nothing for them. */}
                <span className="text-xs font-medium text-secondary">{item.note}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
