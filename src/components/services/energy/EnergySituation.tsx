"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle, House, Lightning, ShieldCheck } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { EnergyPageContent } from "@/lib/energy-page-content";
import { Reveal } from "@/components/shared/Reveal";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { Cta, ICON_TILE, SectionHead } from "./energy-ui";
import { JOURNEY_IDS } from "./journey";

/**
 * Stop 3 of the page — "your situation". It replaces two sections that used to sit
 * far apart and half-empty: "where does your supply come from" (two unequal cards,
 * placed right under the tariff results) and "when should you check your tariff"
 * (a lone checklist beside a blank column). They answer the same question — can /
 * should I switch, given where I am — so they are one module now:
 *
 *   [ tab: Stadtwerke ] [ tab: another provider ]     |  self-check
 *   what it means + what we do + the one CTA          |  4 ticks → the verdict
 *   ───────────────────────────────────────────────────────────────────────
 *   the dark "your power is never cut" reassurance (the page's one dark moment)
 *
 * Both tabs have the same anatomy (heading, text, "what we check / take over",
 * CTA), so neither looks like the lesser option, and the panel has the same height
 * of content whichever is open. The self-check's verdict strip stays collapsed
 * until something is ticked — no empty prompt under an unticked list.
 *
 * Tabs follow the ARIA tabs pattern (arrow keys move between them); the panel
 * fades in over 180ms (infrequent interaction, so a short motion is welcome),
 * and not at all under prefers-reduced-motion.
 */
type Which = "grundversorger" | "alternative";
const TABS: Which[] = ["grundversorger", "alternative"];

export function EnergySituation({ locale, content, formId }: { locale: Locale; content: EnergyPageContent; formId: string }) {
  const { situations, whenToCheck, journey } = content;
  const [which, setWhich] = useState<Which>("grundversorger");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const tabRefs = useRef<Record<Which, HTMLButtonElement | null>>({ grundversorger: null, alternative: null });
  const count = checked.size;
  const shownCount = locale === "fa" ? count.toLocaleString("fa-IR") : String(count);

  const data = {
    grundversorger: { ...situations.grundversorger, icon: House },
    alternative: { ...situations.alternative, icon: Lightning },
  };
  const current = data[which];

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") next = (i + 1) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setWhich(TABS[next]);
    tabRefs.current[TABS[next]]?.focus();
  };

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id={JOURNEY_IDS.situation} className="scroll-mt-32 border-t border-border bg-tint py-14 md:py-20">
      <div className="container-page">
        <Reveal>
          <SectionHead locale={locale} eyebrow={byLocale(locale, journey.nav.situation)} title={byLocale(locale, situations.title)} />
        </Reveal>

        <Reveal delay={0.06} className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:gap-6">
          {/* ---- left: where are you? */}
          <div className="flex flex-col">
            <p className="mb-3 text-sm font-semibold text-purple-900">{byLocale(locale, journey.situation.pick)}</p>
            <div role="tablist" aria-label={byLocale(locale, journey.situation.pick)} className="grid gap-3 sm:grid-cols-2">
              {TABS.map((key, i) => {
                const d = data[key];
                const on = which === key;
                const Icon = d.icon;
                return (
                  <button
                    key={key}
                    ref={(el) => {
                      tabRefs.current[key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`sit-tab-${key}`}
                    aria-selected={on}
                    aria-controls="sit-panel"
                    tabIndex={on ? 0 : -1}
                    onClick={() => setWhich(key)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`press flex min-h-[4.5rem] items-center gap-3.5 rounded-2xl border bg-white p-4 text-start transition-[border-color,box-shadow] duration-150 ease-out ${
                      on ? "border-purple-600 shadow-[0_14px_30px_-20px_rgba(93,0,137,0.55)]" : "border-border hover:border-border-strong"
                    }`}
                  >
                    <span className={`${ICON_TILE} h-11 w-11 transition-colors duration-150 ${on ? "!bg-purple-600 !text-white" : ""}`}>
                      <Icon size={22} weight="duotone" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-latin block text-base font-bold text-purple-900">{d.term}</span>
                      <span className="block text-xs font-medium text-secondary">{byLocale(locale, d.label)}</span>
                    </span>
                    <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${on ? "border-purple-600 bg-purple-600 text-white" : "border-border-strong"}`}>
                      {on && <Check size={11} weight="bold" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <div key={which} id="sit-panel" role="tabpanel" aria-labelledby={`sit-tab-${which}`} className="panel-in mt-3 flex flex-1 flex-col rounded-2xl border border-border bg-white p-6 md:p-7">
              <h3 className="max-w-[30ch] text-balance text-lg font-bold text-purple-900">{byLocale(locale, current.heading)}</h3>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-body">{byLocale(locale, current.text)}</p>
              <p className="mt-5 text-sm font-semibold text-purple-900">{byLocale(locale, current.intro)}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {current.bullets.map((b) => (
                  <li key={b.fa} className="flex items-start gap-2.5 rounded-xl bg-tint px-3.5 py-3 text-sm leading-snug text-body">
                    <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-success" />
                    {byLocale(locale, b)}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Cta href={`#${formId}`}>{byLocale(locale, current.cta)}</Cta>
              </div>
            </div>
          </div>

          {/* ---- right: not sure? tick what applies */}
          <div className="flex flex-col rounded-2xl border border-border bg-white p-6 md:p-7">
            <p className="text-xs font-bold text-purple-600">{byLocale(locale, journey.situation.selfCheck)}</p>
            <h3 className="mt-1.5 max-w-[26ch] text-balance text-lg font-bold text-purple-900">{byLocale(locale, whenToCheck.title)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{byLocale(locale, whenToCheck.lead)}</p>

            <ul className="mt-4 grid gap-2">
              {whenToCheck.items.map((item, i) => (
                <li key={item.fa}>
                  <label className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-tint/60 px-3.5 py-2.5 text-sm text-body transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-border-strong active:scale-[0.99] has-[:checked]:border-purple-600 has-[:checked]:bg-purple-600/5 has-[:checked]:text-purple-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-purple-600/40 motion-reduce:transition-none">
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
              className={`mt-auto grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${count > 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <div className="mt-4 flex flex-col gap-3.5 rounded-xl bg-purple-900 p-4">
                  <p className="text-sm font-medium leading-relaxed text-white">{byLocale(locale, whenToCheck.result).replace("{n}", shownCount)}</p>
                  <ConsultationCtaLink
                    href={`#${formId}`}
                    className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-purple-900 transition-colors hover:bg-tint"
                  >
                    {byLocale(locale, whenToCheck.cta)}
                    <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
                  </ConsultationCtaLink>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        {/* The one dark moment on the page: "will my power be cut?" is the fear that
            stops people switching at all, so it is answered right where they decide
            whether they can switch. */}
        <Reveal delay={0.1} className="mt-5">
          <div className="flex flex-col gap-5 rounded-2xl bg-purple-900 p-6 sm:flex-row sm:items-center md:p-7">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-purple-900">
              <ShieldCheck size={26} weight="fill" />
            </span>
            <div>
              <p className="text-xs font-semibold text-yellow-500">{byLocale(locale, situations.reassurance.title)}</p>
              {situations.reassurance.paragraphs.map((p, i) => (
                <p key={p.fa} className={i === 0 ? "mt-1 text-lg font-bold leading-snug text-white" : "mt-1.5 max-w-[64ch] text-sm leading-relaxed text-white/75"}>
                  {byLocale(locale, p)}
                </p>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
