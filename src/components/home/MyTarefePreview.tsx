import Link from "next/link";
import { Lightning, Tooth, Plus, CheckCircle, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";

// The two real, data-backed tariffs (see pdp-data.ts) — price here must
// match KNOWN_TARIFFS exactly (a prior version showed 28€ for a product
// whose real price is 24€, a factual inconsistency on top of the
// fabrication issue below).
const CONTRACTS = [
  { icon: Lightning, name: { fa: "برق (Vattenfall Naturstrom 12)", de: "Strom (Vattenfall Naturstrom 12)", ru: "Электричество (Vattenfall Naturstrom 12)" }, meta: "72€ / mo" },
  { icon: Tooth, name: { fa: "بیمه دندان (Barmenia Mehr Zahn 100)", de: "Zahnzusatz (Barmenia Mehr Zahn 100)", ru: "Стоматология (Barmenia Mehr Zahn 100)" }, meta: "24€ / mo" },
];

// Formerly a third row named a real company (Telekom) with a fabricated
// product name and price, styled with the same "active contract"
// checkmark as the two real rows — presented as if it were real signed
// customer data. Replaced with an honest empty-slot affordance instead of
// a third invented contract.
const ADD_SLOT_LABEL: Record<Locale, string> = {
  fa: "افزودن قرارداد بعدی",
  de: "Nächsten Vertrag hinzufügen",
  ru: "Добавить следующий договор",
};

export function MyTarefePreview({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="py-16 md:py-24">
      <div className="container-page grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="max-w-[16ch] text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.portalTitle}</h2>
          <p className="mt-3 max-w-[42ch] text-sm text-secondary md:text-base">{dict.home.portalSubtitle}</p>
          <Link
            href="https://tarefe.de/anwendung-herunterladen/"
            className="press mt-6 inline-flex items-center gap-2 rounded-full border border-border-strong px-5 py-3 text-sm font-semibold text-purple-900 transition-colors hover:border-purple-600 hover:text-purple-600"
          >
            {dict.home.portalCta}
            <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <div className="space-y-3">
            {CONTRACTS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.meta} className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                    <Icon size={17} weight="duotone" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-purple-900">{c.name[locale]}</p>
                    <p className="font-latin text-[11px] text-secondary">{c.meta}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-medium text-success">
                    <CheckCircle size={11} weight="fill" />
                  </span>
                </div>
              );
            })}
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong bg-white p-3 text-secondary">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint">
                <Plus size={17} weight="bold" />
              </span>
              <p className="text-xs font-medium">{ADD_SLOT_LABEL[locale]}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
