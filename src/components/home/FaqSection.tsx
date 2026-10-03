"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import type { FaqItem } from "@/components/faq/FaqAccordion";

/**
 * Receives its items as a prop now instead of importing the hardcoded
 * FAQS constant directly — FAQ content moved to the DB (Phase 9's first
 * CMS content type, see prisma/schema.prisma's FaqItem comment), and a
 * "use client" component can't do the Prisma fetch itself; the parent
 * Server Component (src/app/[locale]/page.tsx) fetches and passes down
 * the first 4 published items.
 */
export function FaqSection({ locale, dict, items }: { locale: Locale; dict: Dictionary; items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  if (items.length === 0) return null;

  return (
    <section className="border-t border-border py-16 md:py-24">
      <div className="container-page mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.faqTitle}</h2>

        <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white">
          {items.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div key={faq.q.fa}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                >
                  <span className="text-sm font-semibold text-purple-900">{faq.q[locale]}</span>
                  <Plus size={16} weight="bold" className={`shrink-0 text-purple-600 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
                </button>
                <div className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                  <div className="min-h-0">
                    <p className="px-5 pb-4 text-sm leading-relaxed text-secondary">{faq.a[locale]}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
