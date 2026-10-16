import {
  ArrowRight,
  CaretDown,
  CheckCircle,
  DeviceMobile,
  FileText,
  House,
  Lightning,
  LockKey,
  MagnifyingGlass,
  ShieldCheck,
  Translate,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { EnergyPageContent } from "@/lib/energy-page-content";
import { Reveal } from "@/components/shared/Reveal";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { PriceGuaranteeChart } from "./PriceGuaranteeChart";
import { MarketPriceChart } from "./MarketPriceChart";

/**
 * The electricity / gas page sections that replace PlpView's generic
 * "what is it / benefits / why Tarefe / process" copy. Copy lives in
 * lib/energy-page-content.ts; the tappable checklist is its own client
 * component (EnergyWhenToCheck.tsx).
 *
 * Design intent, section by section — a long, text-heavy page for a
 * trust-sensitive decision, so the job is scannability, not decoration:
 *  - Situations: the two ways a visitor can be supplied today, each with
 *    what they can do about it, in ONE card. (Previously "where does it
 *    come from" and "what can you do" were two sections describing the
 *    same two situations; merging them removed ~100 words, no facts.)
 *    The Grundversorger card is primary (it carries the CTA); the
 *    "your power won't be cut" reassurance is the single dark moment.
 *  - Why now: split layout, so the Preisgarantie term sits beside the
 *    argument that needs it instead of below a wall of text.
 *  - Why Tarefe: copy on one side, a divided list on the other — five
 *    items don't fill a 3-column card grid without an orphaned row.
 *  - Process: a vertical timeline — a real sequence, so numbers carry
 *    information. Each step's explanation opens on tap (native <details>):
 *    the six titles alone already tell the story; the detail is one tap
 *    away, not removed.
 * Palette, radius and type stay on the site's existing tokens; the source
 * copy's emoji markers are Phosphor icons.
 */

const PRIMARY_BUTTON =
  "press inline-flex min-h-11 items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900";

const ICON_TILE = "flex shrink-0 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600";

const WHY_ICON: Record<string, PhosphorIcon> = { compare: MagnifyingGlass, human: Translate, dedicated: UserCircle, admin: FileText, support: DeviceMobile };

type SectionProps = { locale: Locale; content: EnergyPageContent };

function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <ConsultationCtaLink href={href} className={PRIMARY_BUTTON}>
      {children}
      <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
    </ConsultationCtaLink>
  );
}

/** 01b (below the calculator) — the visitor's current supply situation and what they can do about it, plus the reassurance every switcher wants. */
export function EnergySituations({ locale, content, formId }: SectionProps & { formId: string }) {
  const { situations } = content;
  const { grundversorger: a, alternative: b, reassurance } = situations;
  return (
    <Reveal>
      <h2 className="max-w-[30ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, situations.title)}</h2>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col rounded-2xl border border-purple-600/25 bg-[linear-gradient(180deg,rgba(93,0,137,0.06),#fff_34%)] p-6 shadow-[0_18px_40px_-26px_rgba(93,0,137,0.4)] md:p-7">
          <div className="flex items-center gap-3.5">
            <span className={`${ICON_TILE} h-11 w-11`}>
              <House size={22} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="font-latin text-base font-bold text-purple-900">{a.term}</p>
              <p className="text-xs font-medium text-purple-600">{byLocale(locale, a.label)}</p>
            </div>
          </div>
          <h3 className="mt-5 max-w-[28ch] text-balance text-lg font-bold text-purple-900">{byLocale(locale, a.heading)}</h3>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-body">{byLocale(locale, a.text)}</p>
          <p className="mt-5 text-sm font-semibold text-purple-900">{byLocale(locale, a.intro)}</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {a.bullets.map((bullet) => (
              <li key={bullet.fa} className="flex items-start gap-2.5 rounded-xl bg-tint px-3.5 py-3 text-sm leading-snug text-body">
                <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-success" />
                {byLocale(locale, bullet)}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <Cta href={`#${formId}`}>{byLocale(locale, a.cta)}</Cta>
          </div>
        </div>

        <div className="self-start rounded-2xl border border-border bg-white p-6 transition-colors duration-200 hover:border-purple-600/30 motion-reduce:transition-none md:p-7">
          <div className="flex items-center gap-3.5">
            <span className={`${ICON_TILE} h-11 w-11`}>
              <Lightning size={22} weight="duotone" />
            </span>
            <div className="min-w-0">
              <p className="font-latin text-base font-bold text-purple-900">{b.term}</p>
              <p className="text-xs font-medium text-purple-600">{byLocale(locale, b.label)}</p>
            </div>
          </div>
          <h3 className="mt-5 max-w-[28ch] text-balance text-lg font-bold text-purple-900">{byLocale(locale, b.heading)}</h3>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-body">{byLocale(locale, b.text)}</p>
        </div>
      </div>

      {/* The one dark moment on the page. "Will my power be cut?" is the
          fear that stops people switching at all — this earns the
          contrast, and the gold icon tile echoes the process timeline's
          final step. */}
      <div className="mt-5 flex flex-col gap-5 rounded-2xl bg-purple-900 p-6 sm:flex-row sm:items-center md:p-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-purple-900">
          <ShieldCheck size={26} weight="fill" />
        </span>
        <div>
          <p className="text-xs font-semibold text-yellow-500">{byLocale(locale, reassurance.title)}</p>
          {reassurance.paragraphs.map((p, i) => (
            <p key={p.fa} className={i === 0 ? "mt-1 text-lg font-bold leading-snug text-white" : "mt-1.5 max-w-[64ch] text-sm leading-relaxed text-white/75"}>
              {byLocale(locale, p)}
            </p>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/** 02 — replaces "what exactly is X?" */
export function EnergyWhyNow({ locale, content }: SectionProps) {
  const { whyNow } = content;
  // Last paragraph leads into the Preisgarantie card; the rest is body text.
  const bodyParagraphs = whyNow.paragraphs.slice(0, -1);
  const intro = whyNow.paragraphs[whyNow.paragraphs.length - 1];
  return (
    <section className="container-page py-14 md:py-16">
      <Reveal className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div>
          <h2 className="max-w-[24ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, whyNow.title)}</h2>
          <div className="mt-5 grid max-w-[60ch] gap-4">
            {bodyParagraphs.map((p) => (
              <p key={p.fa} className="text-base leading-relaxed text-secondary">
                {byLocale(locale, p)}
              </p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-secondary">{byLocale(locale, intro)}</p>
          <div className="mt-3 rounded-2xl border border-border bg-tint p-6">
            <div className="flex items-center gap-3.5">
              <span className={`${ICON_TILE} h-11 w-11 bg-white`}>
                <LockKey size={22} weight="duotone" />
              </span>
              <div>
                <p className="font-latin text-xl font-bold leading-tight text-purple-900">{whyNow.callout.term}</p>
                <p className="mt-0.5 text-xs font-semibold text-purple-600">{byLocale(locale, whyNow.callout.label)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-body">{byLocale(locale, whyNow.callout.body)}</p>
            {/* Live wholesale prices; the number-free schematic stays as the fallback when the feed is unavailable. */}
            <MarketPriceChart commodity={content.kind} locale={locale} fallback={<PriceGuaranteeChart locale={locale} labels={whyNow.callout.chart} />} />
          </div>
          <p className="mt-5 text-base font-semibold leading-relaxed text-purple-900">{byLocale(locale, whyNow.closing)}</p>
        </div>
      </Reveal>
    </section>
  );
}

/** 06 — replaces "why Tarefe?" and absorbs 08 ("why not do it myself?"), which says the same thing. Tinted: 02 above and 07 below are both white. */
export function EnergyWhyTarefe({ locale, content }: SectionProps) {
  const { whyTarefe } = content;
  const lead = whyTarefe.lead.map((l) => byLocale(locale, l)).filter(Boolean);
  return (
    <section className="border-t border-border bg-tint py-14 md:py-16">
      <Reveal className="container-page grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <h2 className="max-w-[24ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, whyTarefe.title)}</h2>
          <div className="mt-4 grid max-w-[46ch] gap-2.5">
            {lead.map((line, i) => (
              <p key={line} className={`text-base leading-relaxed ${i === lead.length - 1 ? "font-semibold text-purple-900" : "text-secondary"}`}>
                {line}
              </p>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {whyTarefe.items.map((item) => {
            const Icon = WHY_ICON[item.key];
            return (
              <li key={item.key} className="flex gap-4 p-5">
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
        </ul>
      </Reveal>
    </section>
  );
}

/**
 * 07 — the six steps as a vertical timeline; the last node is gold, same as
 * the homepage journey, since support doesn't end when the process does.
 * Each step is a native <details>: the title is the summary, the one-line
 * explanation opens on tap. White: 06 above is tinted.
 */
export function EnergyProcess({ locale, content, formId }: SectionProps & { formId: string }) {
  const { process } = content;
  const last = process.steps.length - 1;
  return (
    <section className="border-t border-border py-14 md:py-16">
      <div className="container-page grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-14">
        <Reveal className="self-start lg:sticky lg:top-28">
          <h2 className="max-w-[22ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, process.title)}</h2>
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
