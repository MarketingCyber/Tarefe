"use client";

import { motion, useReducedMotion } from "motion/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { EnergyPageContent } from "@/lib/energy-page-content";

/**
 * Schematic of what a Preisgarantie means: the market price wanders, the
 * visitor's price stays flat until the end of the contract term.
 *
 * Deliberately number-free and labelled "schematic" — it illustrates the
 * guarantee, it is not data (same standing rule as the rest of this site:
 * no invented prices). Reading direction follows the page: in RTL the SVG
 * is mirrored so "today" sits on the right, matching the HTML axis labels
 * under it (the SVG itself contains no text, so mirroring is safe).
 *
 * Motion: the two lines draw themselves once, when scrolled into view —
 * market first, then the flat line a beat later, then the end marker —
 * so the eye reads "chaos → calm". Strong ease-out, ~1s, since this is
 * explanatory motion rather than UI feedback. Reduced-motion renders the
 * finished drawing with no animation.
 */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// y=70 is the flat line (the price on day one); the market line wanders around it.
const MARKET_PATH = "M8 70 L36 52 L62 84 L92 36 L120 66 L150 26 L180 62 L210 34 L240 72 L268 44 L296 70 L312 58";
const FLAT_PATH = "M8 70 L312 70";

export function PriceGuaranteeChart({ locale, labels }: { locale: Locale; labels: EnergyPageContent["whyNow"]["callout"]["chart"] }) {
  const reduce = useReducedMotion();
  const draw = (delay: number, duration: number) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { pathLength: 0 },
          whileInView: { pathLength: 1 },
          viewport: { once: true, amount: 0.6 },
          transition: { duration, delay, ease: EASE_OUT },
        };

  return (
    <figure className="mt-5 rounded-xl bg-white p-4">
      <svg viewBox="0 0 320 110" role="img" aria-label={`${byLocale(locale, labels.market)} / ${byLocale(locale, labels.yours)} — ${byLocale(locale, labels.note)}`} className="h-auto w-full rtl:-scale-x-100">
        {/* faint baseline grid */}
        <path d="M8 100 L312 100" className="stroke-border" strokeWidth="1" fill="none" />
        <path d="M8 18 L8 100" className="stroke-border" strokeWidth="1" fill="none" />

        {/* market price — wanders */}
        <motion.path d={MARKET_PATH} className="stroke-secondary/60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" {...draw(0, 1.1)} />

        {/* the visitor's price — flat until the end of the term */}
        <motion.path d={FLAT_PATH} className="stroke-purple-600" strokeWidth="3.5" strokeLinecap="round" fill="none" {...draw(0.35, 0.9)} />

        {/* today + end-of-term markers */}
        <circle cx="8" cy="70" r="5" className="fill-purple-600" />
        <motion.circle
          cx="312"
          cy="70"
          r="5"
          className="fill-yellow-500 stroke-purple-600"
          strokeWidth="2"
          {...(reduce ? { initial: false as const } : { initial: { scale: 0, opacity: 0 }, whileInView: { scale: 1, opacity: 1 }, viewport: { once: true, amount: 0.6 }, transition: { duration: 0.35, delay: 1.2, ease: EASE_OUT } })}
          style={{ transformOrigin: "312px 70px", transformBox: "view-box" }}
        />
      </svg>

      <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-secondary">
        <span>{byLocale(locale, labels.today)}</span>
        <span>{byLocale(locale, labels.end)}</span>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px] text-secondary">
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-5 rounded-full bg-secondary/60" />
            {byLocale(locale, labels.market)}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-purple-900">
            <span aria-hidden className="h-1 w-5 rounded-full bg-purple-600" />
            {byLocale(locale, labels.yours)}
          </span>
        </span>
        <span className="opacity-70">{byLocale(locale, labels.note)}</span>
      </figcaption>
    </figure>
  );
}
