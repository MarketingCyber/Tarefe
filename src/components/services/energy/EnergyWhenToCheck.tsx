"use client";

import { useState } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { EnergyPageContent } from "@/lib/energy-page-content";
import { Reveal } from "@/components/shared/Reveal";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";

/**
 * "When should I check my tariff?" as a tappable self-check instead of a
 * passive list. The copy's own promise is "if ANY of these applies, it's
 * worth a look" — so ticking one is the natural trigger for the call to
 * action, which stays collapsed until it's earned (no empty prompt sitting
 * under an unticked list).
 *
 * Native checkboxes under the styling (visually hidden, not display:none),
 * so keyboard, screen readers and focus all work without ARIA scaffolding.
 * The result strip animates grid-template-rows 0fr→1fr + opacity: the only
 * height animation that doesn't need a measured pixel value, and it's inert
 * while collapsed so its link can't be tabbed to unseen.
 */
export function EnergyWhenToCheck({ locale, content, formId }: { locale: Locale; content: EnergyPageContent["whenToCheck"]; formId: string }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const count = checked.size;
  const shownCount = locale === "fa" ? count.toLocaleString("fa-IR") : String(count);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section className="border-t border-border bg-tint py-14">
      <div className="container-page grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <Reveal>
          <h2 className="max-w-[26ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, content.title)}</h2>
          <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-secondary">{byLocale(locale, content.lead)}</p>
        </Reveal>

        <Reveal delay={0.08}>
          <ul className="grid gap-2.5">
            {content.items.map((item, i) => (
              <li key={item.fa}>
                <label className="group flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-white px-4 py-3 text-sm text-body transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-border-strong active:scale-[0.99] has-[:checked]:border-purple-600 has-[:checked]:bg-purple-600/5 has-[:checked]:text-purple-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-purple-600/40 motion-reduce:transition-none">
                  <input type="checkbox" className="peer sr-only" checked={checked.has(i)} onChange={() => toggle(i)} />
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-border-strong bg-white text-white transition-colors duration-150 peer-checked:border-purple-600 peer-checked:bg-purple-600 [&>svg]:scale-75 [&>svg]:opacity-0 [&>svg]:transition-[transform,opacity] [&>svg]:duration-150 peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100 motion-reduce:[&>svg]:transition-none"
                  >
                    <Check size={12} weight="bold" />
                  </span>
                  <span className="leading-snug">{byLocale(locale, item)}</span>
                </label>
              </li>
            ))}
          </ul>

          <div
            aria-live="polite"
            inert={count === 0}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
              count > 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-4 flex flex-col gap-4 rounded-2xl bg-purple-900 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium leading-relaxed text-white">{byLocale(locale, content.result).replace("{n}", shownCount)}</p>
                <ConsultationCtaLink
                  href={`#${formId}`}
                  className="press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-purple-900 transition-colors hover:bg-tint"
                >
                  {byLocale(locale, content.cta)}
                  <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
                </ConsultationCtaLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
