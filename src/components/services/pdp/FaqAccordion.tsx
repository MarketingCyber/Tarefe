"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { byLocale, type Locale, type LocalizedText } from "@/lib/taxonomy";

/**
 * Collapsed by default, not the static open grid this replaced — 6-7 Q&A
 * pairs all expanded at once is a lot of dense text competing for
 * attention on a page that's already 11 sections long. Same
 * one-open-doesn't-close-others interaction as CoverageAccordion.tsx (a
 * real thing here too: comparing two answers side by side), just single-
 * column since FAQ answers run longer than a coverage item.
 */
export function FaqAccordion({ locale, items }: { locale: Locale; items: { q: LocalizedText; a: LocalizedText }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="mt-6 grid gap-3">
      {items.map((faq, i) => {
        const isOpen = open.has(i);
        return (
          <div key={faq.q.fa} className="overflow-hidden rounded-2xl border border-border bg-white">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-5 py-4 text-start text-sm font-semibold text-purple-900"
            >
              {byLocale(locale, faq.q)}
              <CaretDown size={15} weight="bold" className={`shrink-0 text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-secondary">{byLocale(locale, faq.a)}</p>}
          </div>
        );
      })}
    </div>
  );
}
