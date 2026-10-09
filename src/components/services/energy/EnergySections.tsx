import {
  ArrowDown,
  ArrowRight,
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

/**
 * The electricity / gas page sections that replace PlpView's generic
 * "what is it / benefits / why Tarefe / process" copy. Each slots into the
 * same position its generic counterpart occupies — the page order is
 * unchanged, only the content and layout in each slot are. Copy lives in
 * lib/energy-page-content.ts; the tappable checklist is its own client
 * component (EnergyWhenToCheck.tsx).
 *
 * Design intent, section by section — a long, text-heavy page for a
 * trust-sensitive decision, so the job is scannability, not decoration:
 *  - Supply paths: two "doors" that each link down to the card answering
 *    that exact situation. The page's through-line.
 *  - Why now: split layout, so the Preisgarantie term sits beside the
 *    argument that needs it instead of below a wall of text.
 *  - Options: the Grundversorger card is the primary one (it has the CTA);
 *    the "your power won't be cut" reassurance is the single dark moment.
 *  - Why Tarefe: copy on one side, a divided list on the other — five
 *    items don't fill a 3-column card grid without an orphaned row.
 *  - Process: a vertical timeline — this IS a real sequence, so numbers
 *    carry information.
 * Palette, radius and type stay on the site's existing tokens; the source
 * copy's emoji markers are Phosphor icons.
 */

const PRIMARY_BUTTON =
  "press inline-flex min-h-11 items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900";

const ICON_TILE = "flex shrink-0 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600";

const PATH_ICON: Record<string, PhosphorIcon> = { grundversorger: House, alternative: Lightning };
const WHY_ICON: Record<string, PhosphorIcon> = { compare: MagnifyingGlass, human: Translate, dedicated: UserCircle, admin: FileText, support: DeviceMobile };

/** Anchor ids shared between the path cards (links) and the option cards (targets). */
const OPTION_ID = { grundversorger: "energy-option-grundversorger", alternative: "energy-option-alternative" } as const;

type SectionProps = { locale: Locale; content: EnergyPageContent };

function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <ConsultationCtaLink href={href} className={PRIMARY_BUTTON}>
      {children}
      <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
    </ConsultationCtaLink>
  );
}

/** 01b (below the calculator) — where does the visitor's supply come from today? Two doors, each leading to its answer further down. */
export function EnergySupplyPaths({ locale, content }: SectionProps) {
  const { supply } = content;
  return (
    <Reveal>
      <h2 className="max-w-[30ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, supply.title)}</h2>
      <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-secondary">{byLocale(locale, supply.lead)}</p>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {supply.paths.map((path) => {
          const Icon = PATH_ICON[path.key];
          return (
            <div key={path.key} className="flex flex-col rounded-2xl border border-border bg-white p-6 transition-colors duration-200 hover:border-purple-600/30">
              <div className="flex items-center gap-3.5">
                <span className={`${ICON_TILE} h-11 w-11`}>
                  <Icon size={22} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <p className="font-latin text-base font-bold text-purple-900">{path.term}</p>
                  <p className="text-xs font-medium text-purple-600">{byLocale(locale, path.label)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {path.paragraphs.map((p) => (
                  <p key={p.fa} className="max-w-[60ch] text-sm leading-relaxed text-body">
                    {byLocale(locale, p)}
                  </p>
                ))}
              </div>
              <a
                href={`#${OPTION_ID[path.key]}`}
                className="group mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-sm font-semibold text-purple-600 transition-colors hover:text-purple-900"
              >
                {byLocale(locale, supply.linkLabel)}
                <ArrowDown size={14} weight="bold" className="transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-y-0.5 motion-reduce:transition-none" />
              </a>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

/** 02 — replaces "what exactly is X?" */
export function EnergyWhyNow({ locale, content }: SectionProps) {
  const { whyNow } = content;
  const [p1, p2, intro] = whyNow.paragraphs;
  return (
    <section className="container-page py-14 md:py-16">
      <Reveal className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div>
          <h2 className="max-w-[24ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, whyNow.title)}</h2>
          <div className="mt-5 grid max-w-[60ch] gap-4">
            {[p1, p2].map((p) => (
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
          </div>
          <p className="mt-5 text-base font-semibold leading-relaxed text-purple-900">{byLocale(locale, whyNow.closing)}</p>
        </div>
      </Reveal>
    </section>
  );
}

/** 03 — replaces "what are the benefits?": the two situations a visitor can be in, plus the reassurance every switcher wants. */
export function EnergyOptions({ locale, content, formId }: SectionProps & { formId: string }) {
  const { grundversorger, other, reassurance } = content.options;
  return (
    <section className="border-t border-border bg-tint py-14 md:py-16">
      <div className="container-page">
        <Reveal>
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              id={OPTION_ID.grundversorger}
              className="flex scroll-mt-24 flex-col rounded-2xl border border-purple-600/25 bg-white p-6 shadow-[0_18px_40px_-26px_rgba(93,0,137,0.4)] md:p-7"
            >
              <h2 className="max-w-[28ch] text-balance text-xl font-bold text-purple-900">{byLocale(locale, grundversorger.title)}</h2>
              <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-body">{byLocale(locale, grundversorger.lead)}</p>
              <p className="mt-5 text-sm font-semibold text-purple-900">{byLocale(locale, grundversorger.intro)}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {grundversorger.bullets.map((b) => (
                  <li key={b.fa} className="flex items-start gap-2.5 rounded-xl bg-tint px-3.5 py-3 text-sm leading-snug text-body">
                    <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-success" />
                    {byLocale(locale, b)}
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[56ch] text-sm leading-relaxed text-secondary">{byLocale(locale, grundversorger.outro)}</p>
              <div className="mt-6">
                <Cta href={`#${formId}`}>{byLocale(locale, grundversorger.cta)}</Cta>
              </div>
            </div>

            <div id={OPTION_ID.alternative} className="scroll-mt-24 self-start rounded-2xl border border-border bg-white p-6 md:p-7">
              <h2 className="max-w-[28ch] text-balance text-xl font-bold text-purple-900">{byLocale(locale, other.title)}</h2>
              <div className="mt-4 grid gap-3.5">
                {other.paragraphs.map((p) => (
                  <p key={p.fa} className="max-w-[56ch] text-sm leading-relaxed text-body">
                    {byLocale(locale, p)}
                  </p>
                ))}
              </div>
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
      </div>
    </section>
  );
}

/** 06 — replaces "why Tarefe?" and absorbs 08 ("why not do it myself?"), which says the same thing. */
export function EnergyWhyTarefe({ locale, content }: SectionProps) {
  const { whyTarefe } = content;
  const lead = whyTarefe.lead.map((l) => byLocale(locale, l)).filter(Boolean);
  return (
    <section className="container-page py-14 md:py-16">
      <Reveal className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div>
          <h2 className="max-w-[24ch] text-balance text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, whyTarefe.title)}</h2>
          <div className="mt-4 grid max-w-[46ch] gap-2.5">
            {lead.map((line, i) => (
              <p key={line} className={`text-base leading-relaxed ${i === lead.length - 1 && lead.length > 3 ? "font-semibold text-purple-900" : "text-secondary"}`}>
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

/** 07 — the six steps as a vertical timeline; the last node is gold, same as the homepage journey, since support doesn't end when the process does. */
export function EnergyProcess({ locale, content, formId }: SectionProps & { formId: string }) {
  const { process } = content;
  const last = process.steps.length - 1;
  return (
    <section className="border-t border-border bg-tint py-14 md:py-16">
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
                <Reveal delay={Math.min(i, 3) * 0.04} className={`relative flex gap-4 ${i === last ? "" : "pb-8"}`}>
                  {i !== last && <span aria-hidden className="absolute start-[15px] -bottom-1 top-9 w-px bg-border-strong" />}
                  <span
                    className={`font-latin relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-tint ${
                      i === last ? "bg-yellow-500 text-purple-900" : "bg-purple-600 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="text-base font-semibold text-purple-900">{byLocale(locale, step.title)}</p>
                    <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-secondary">{byLocale(locale, step.body)}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
          <div className="mt-8 lg:hidden">
            <Cta href={`#${formId}`}>{byLocale(locale, process.cta)}</Cta>
          </div>
        </div>
      </div>
    </section>
  );
}
