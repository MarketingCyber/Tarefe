"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import type { Locale, LocalizedText } from "@/lib/taxonomy";

export interface FaqItem {
  q: LocalizedText;
  a: LocalizedText;
}

export function FaqAccordion({ items, locale }: { items: FaqItem[]; locale: Locale }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-white">
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
  );
}
