"use client";

import { useState } from "react";
import { CaretDown, CheckCircle } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { PdpCoverageGroup } from "@/lib/pdp-content";

/**
 * Cards + accordion, not one long list — a full breakdown of every
 * covered item for every group at once reads as a wall of text on a page
 * that's supposed to build confidence, not homework. Collapsed by
 * default; opening one doesn't close the others, since comparing two
 * groups side by side is a real thing someone here would want to do.
 */
export function CoverageAccordion({ locale, groups }: { locale: Locale; groups: PdpCoverageGroup[] }) {
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
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group, i) => {
        const isOpen = open.has(i);
        return (
          <div key={group.title.fa} className="overflow-hidden rounded-2xl border border-border bg-white">
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="flex min-h-11 w-full items-center justify-between px-4 py-3.5 text-start text-sm font-semibold text-purple-900"
            >
              {byLocale(locale, group.title)}
              <CaretDown size={15} weight="bold" className={`shrink-0 text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <ul className="space-y-2 border-t border-border px-4 py-3.5">
                {group.items.map((item) => (
                  <li key={item.fa} className="flex items-start gap-2 text-xs leading-relaxed text-secondary">
                    <CheckCircle size={14} weight="fill" className="mt-0.5 shrink-0 text-success" />
                    {byLocale(locale, item)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
