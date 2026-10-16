import { CaretDown, DeviceMobile, FileText, Headset, LockKey, MagnifyingGlass, Translate, UserCircle } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { EnergyPageContent } from "@/lib/energy-page-content";
import { MARKET_LABELS } from "@/lib/market-chart-labels";
import { Reveal } from "@/components/shared/Reveal";
import { PriceGuaranteeChart } from "./PriceGuaranteeChart";
import { MarketPriceChart } from "./MarketPriceChart";
import { Cta, ICON_TILE, PRIMARY_BUTTON, SectionHead } from "./energy-ui";
import { JOURNEY_IDS } from "./journey";

/**
 * The electricity / gas page sections that replace PlpView's generic
 * "what is it / benefits / why Tarefe / process" copy. Copy lives in
 * lib/energy-page-content.ts.
 *
 * The page is ONE path, in the order the visitor's questions come up, and each
 * stop has a chip in the sticky nav (EnergyJourneyNav) and an id here:
 *
 *   1 calculator — what will I pay?           (EnergyConsumptionCalculator + the "next step" panel under its results)
 *   2 why now    — why act at all?            (EnergyWhyNow: problem → evidence → the Preisgarantie answer → back to 1)
 *   3 situation  — can I switch from where I am? (EnergySituation.tsx)
 *   4 process    — how does it work?          (EnergyProcess)
 *   5 trust      — why you, and who are you?  (EnergyWhyTarefe + the "real team" note)
 *   6 faq        — what if …?                 (PlpView)
 *   → the one form at the bottom.
 *
 * Layout rules learned from the first version (2026-10-17, "awful" on desktop):
 *  - no two-column section where one column is a short paragraph and the other a
 *    tall card — the short side leaves a hole; columns carry comparable weight or
 *    the section is stacked;
 *  - alternating section backgrounds mark the boundary between stops;
 *  - every section opens with its stop's name (SectionHead) and ends by pointing
 *    somewhere: the calculator, the form, or the next stop.
 * Palette, radius and type stay on the site's existing tokens.
 */

const WHY_ICON: Record<string, PhosphorIcon> = { compare: MagnifyingGlass, human: Translate, dedicated: UserCircle, admin: FileText, support: DeviceMobile };

type SectionProps = { locale: Locale; content: EnergyPageContent };

/**
 * Stop 2 — why act now. Three beats, top to bottom, so it reads as an argument
 * instead of three unrelated pieces: the problem (text), the evidence (the live
 * price chart, full width), the answer (the Preisgarantie band) — and the band's
 * button sends the visitor back up to the calculator to act on it.
 */
export function EnergyWhyNow({ locale, content }: SectionProps) {
  const { whyNow, journey } = content;
  // The last paragraph is the lead-in to the Preisgarantie band ("With all our tariffs:"); the rest is the argument.
  const argument = whyNow.paragraphs.slice(0, -1);
  const leadIn = whyNow.paragraphs[whyNow.paragraphs.length - 1];
  const guarantee = MARKET_LABELS[content.kind].guarantee;

  return (
    <section id={JOURNEY_IDS.whyNow} className="scroll-mt-32 py-14 md:py-20">
      <div className="container-page">
        <Reveal className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-14">
          <SectionHead locale={locale} eyebrow={byLocale(locale, journey.nav.whyNow)} title={byLocale(locale, whyNow.title)} />
          <div className="grid max-w-[60ch] gap-3">
            {argument.map((p) => (
              <p key={p.fa} className="text-base leading-relaxed text-secondary">
                {byLocale(locale, p)}
              </p>
            ))}
          </div>
        </Reveal>

        {/* evidence — live wholesale prices; the number-free schematic stays as the fallback if the feed is unavailable */}
        <Reveal delay={0.06} className="mt-8">
          <MarketPriceChart commodity={content.kind} locale={locale} fallback={<PriceGuaranteeChart locale={locale} labels={whyNow.callout.chart} />} />
        </Reveal>

        {/* answer */}
        <Reveal delay={0.1} className="mt-5">
          <div className="grid gap-6 rounded-2xl border border-purple-600/25 bg-[linear-gradient(135deg,rgba(93,0,137,0.07),#fff_55%)] p-6 md:p-7 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8">
            <div className="flex items-center gap-3.5">
              <span className={`${ICON_TILE} h-12 w-12 bg-white`}>
                <LockKey size={24} weight="duotone" />
              </span>
              <div>
                <p className="text-xs font-semibold text-secondary">{byLocale(locale, leadIn)}</p>
                <p className="font-latin text-xl font-bold leading-tight text-purple-900">{whyNow.callout.term}</p>
                <p className="mt-0.5 text-xs font-semibold text-purple-600">{byLocale(locale, whyNow.callout.label)}</p>
              </div>
            </div>
            <div className="max-w-[62ch]">
              <p className="text-sm leading-relaxed text-body">{byLocale(locale, whyNow.callout.body)}</p>
              <p className="mt-1.5 text-base font-bold leading-snug text-purple-900">{byLocale(locale, guarantee)}</p>
            </div>
            <a href={`#${JOURNEY_IDS.calculator}`} className={`${PRIMARY_BUTTON} justify-center`}>
              {byLocale(locale, journey.whyNowCta)}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Stop 5 — trust: why Tarefe (replaces "why Tarefe?" and absorbs "why not do it
 * myself?", which said the same thing) and, closing it, the note that real
 * customer comments will appear here — kept in the same section so the proof
 * reads as one block instead of a stray strip. Tinted: the sections around it are white.
 */
export function EnergyWhyTarefe({ locale, content, formId }: SectionProps & { formId: string }) {
  const { whyTarefe, journey, process } = content;
  const lead = whyTarefe.lead.map((l) => byLocale(locale, l)).filter(Boolean);
  return (
    <section id={JOURNEY_IDS.trust} className="scroll-mt-32 border-t border-border bg-tint py-14 md:py-20">
      <div className="container-page">
        <Reveal className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div className="lg:sticky lg:top-40 lg:self-start">
            <SectionHead locale={locale} eyebrow={byLocale(locale, journey.nav.trust)} title={byLocale(locale, whyTarefe.title)} />
            <div className="mt-4 grid max-w-[46ch] gap-2.5">
              {lead.map((line, i) => (
                <p key={line} className={`text-base leading-relaxed ${i === lead.length - 1 ? "font-semibold text-purple-900" : "text-secondary"}`}>
                  {line}
                </p>
              ))}
            </div>
            <div className="mt-6 hidden lg:block">
              <Cta href={`#${formId}`}>{byLocale(locale, process.cta)}</Cta>
            </div>
          </div>

          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
            {whyTarefe.items.map((item) => {
              const Icon = WHY_ICON[item.key];
              return (
                <li key={item.key} className="flex gap-4 p-5 md:p-6">
                  <span className={`${ICON_TILE} h-10 w-10`}>
                    <Icon size={20} weight="duotone" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-purple-900">{byLocale(locale, item.title)}</p>
                    <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-secondary">{byLocale(locale, item.body)}</p>
                  </div>
                </li>
              );
            })}
            <li className="flex gap-4 bg-tint/60 p-5 md:p-6">
              <span className={`${ICON_TILE} h-10 w-10 bg-white`}>
                <Headset size={20} weight="duotone" />
              </span>
              <div>
                <p className="text-base font-semibold text-purple-900">{byLocale(locale, { fa: "یک تیم واقعی پشت تعرفه است", de: "Hinter Tarefe steht ein echtes Team", ru: "За Tarefe стоит настоящая команда" })}</p>
                <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-secondary">
                  {byLocale(locale, {
                    fa: "به‌محض این‌که مشتریان واقعی نظر خود را با ما در میان بگذارند، تجربه‌های واقعی آن‌ها همین‌جا منتشر می‌شود — بدون نظر ساختگی.",
                    de: "Sobald echte Kunden ihre Erfahrungen mit uns teilen, veröffentlichen wir sie genau hier — ohne erfundene Bewertungen.",
                    ru: "Как только реальные клиенты поделятся своим опытом, мы опубликуем его здесь — без выдуманных отзывов.",
                  })}
                </p>
              </div>
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Stop 4 — the six steps as a vertical timeline; the last node is gold, same as
 * the homepage journey, since support doesn't end when the process does.
 * Each step is a native <details>: the title is the summary, the one-line
 * explanation opens on tap. White: the situation stop above is tinted.
 */
export function EnergyProcess({ locale, content, formId }: SectionProps & { formId: string }) {
  const { process, journey } = content;
  const last = process.steps.length - 1;
  return (
    <section id={JOURNEY_IDS.process} className="scroll-mt-32 border-t border-border py-14 md:py-20">
      <div className="container-page grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <Reveal className="self-start lg:sticky lg:top-40">
          <SectionHead locale={locale} eyebrow={byLocale(locale, journey.nav.process)} title={byLocale(locale, process.title)} />
          <div className="mt-6 hidden lg:block">
            <Cta href={`#${formId}`}>{byLocale(locale, process.cta)}</Cta>
          </div>
        </Reveal>

        <div>
          <ol>
            {process.steps.map((step, i) => (
              <li key={step.title.fa}>
                <Reveal delay={Math.min(i, 3) * 0.04} className={`relative flex gap-4 ${i === last ? "" : "pb-5"}`}>
                  {i !== last && <span aria-hidden className="absolute start-[15px] -bottom-1 top-9 w-px bg-border-strong" />}
                  <span
                    className={`font-latin relative z-10 mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white ${
                      i === last ? "bg-yellow-500 text-purple-900" : "bg-purple-600 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <details className="group min-w-0 flex-1">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-2 text-base font-semibold text-purple-900 marker:content-none [&::-webkit-details-marker]:hidden">
                      {byLocale(locale, step.title)}
                      <CaretDown size={15} weight="bold" className="shrink-0 text-secondary transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
                    </summary>
                    <p className="max-w-[52ch] pb-1 text-sm leading-relaxed text-secondary">{byLocale(locale, step.body)}</p>
                  </details>
                </Reveal>
              </li>
            ))}
          </ol>
          <div className="mt-6 lg:hidden">
            <Cta href={`#${formId}`}>{byLocale(locale, process.cta)}</Cta>
          </div>
        </div>
      </div>
    </section>
  );
}
