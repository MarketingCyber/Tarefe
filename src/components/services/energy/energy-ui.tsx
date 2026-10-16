import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";

/** Shared building blocks of the electricity / gas page sections. */

export const PRIMARY_BUTTON =
  "press inline-flex min-h-11 items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900";

export const ICON_TILE = "flex shrink-0 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600";

export function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <ConsultationCtaLink href={href} className={PRIMARY_BUTTON}>
      {children}
      <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
    </ConsultationCtaLink>
  );
}

/**
 * Every section opens the same way: where it sits on the visitor's path (the
 * same label as its chip in the sticky nav), then the question it answers.
 * Persian is a connected script, so the eyebrow gets no letter-spacing or
 * uppercase there.
 */
export function SectionHead({ locale, eyebrow, title, lead, className = "" }: { locale: Locale; eyebrow: string; title: string; lead?: string; className?: string }) {
  return (
    <div className={className}>
      <p className={`mb-3 flex items-center gap-2.5 text-xs font-bold text-purple-600 ${locale === "fa" ? "" : "uppercase tracking-[0.08em]"}`}>
        <span aria-hidden className="h-px w-8 bg-purple-600/40" />
        {eyebrow}
      </p>
      <h2 className="max-w-[26ch] text-balance text-2xl font-bold leading-tight text-purple-900 md:text-3xl">{title}</h2>
      {lead && <p className="mt-3 max-w-[56ch] text-base leading-relaxed text-secondary">{lead}</p>}
    </div>
  );
}
