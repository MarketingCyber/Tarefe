"use client";

import { useRef } from "react";
import { Quotes, Star, ArrowRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { Locale } from "@/lib/taxonomy";

export interface TestimonialCardData {
  id: string;
  quote: string;
  customerName: string;
  serviceLabel: string | null;
  rating: number | null;
}

// A few fixed, calm tint pairs for the initials badge — cycled by index,
// not derived from the name (nothing about a name should decide its own
// color; that just reads as arbitrary either way, so a fixed rotation is
// no less "random" than a hash would be, and is simpler).
const BADGE_TINTS = ["bg-purple-600/10 text-purple-600", "bg-yellow-500/15 text-purple-900", "bg-success-bg text-success"];

export function TestimonialCarousel({ locale, items }: { locale: Locale; items: TestimonialCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-testimonial-card]");
    const step = (card?.offsetWidth ?? 320) + 16;
    // rtl:true page — scrollLeft's sign convention flips across browsers
    // under dir="rtl", so ask the track its own direction rather than
    // hardcoding which sign means "forward" for this locale.
    const forward = getComputedStyle(track).direction === "rtl" ? -1 : 1;
    track.scrollBy({ left: forward * dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div>
      {/* overflow-y-hidden isn't decorative here — per spec, an overflow-x
          other than `visible` paired with an unset overflow-y makes
          browsers treat that `visible` as `auto` too, so any sub-pixel
          excess (cards of differing heights, box-shadow bleed) was enough
          to put a vertical scrollbar on this row.

          scroll-px-4 matches px-4 so the track's resting position is
          already a valid snap point, and no scroll-smooth on the track
          itself (the arrow buttons pass behavior:"smooth" explicitly).
          Without both, the browser re-snapped the track by 16px as soon
          as layout settled on load — animated, so on the compositor — and
          Chrome treats a compositor scroll like a user scroll: it stops
          recording Largest Contentful Paint for the rest of the page load.
          Found 2026-10-01 via a raw Lighthouse trace: the snap fired at
          ~1.8s, before first paint, so the homepage reported NO_LCP on
          mobile (performance score 0) while every other metric was fine. */}
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overflow-y-hidden px-4 scroll-px-4 pb-3 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
      >
        {items.map((t, i) => {
          const initial = t.customerName.trim().charAt(0);
          return (
            <motion.div
              key={t.id}
              data-testimonial-card
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex w-[280px] shrink-0 snap-start flex-col gap-4 rounded-3xl border border-border bg-white p-6 shadow-card sm:w-[320px]"
            >
              <Quotes size={34} weight="fill" className="text-yellow-500/70" />

              {t.rating && (
                <div className="-mt-1 flex gap-0.5 text-warning" aria-label={`${t.rating}/5`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={12} weight={s < t.rating! ? "fill" : "regular"} />
                  ))}
                </div>
              )}

              <p className="flex-1 text-sm leading-relaxed text-body">{t.quote}</p>

              <div className="flex items-center gap-2.5 border-t border-border pt-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${BADGE_TINTS[i % BADGE_TINTS.length]}`}>
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-purple-900">{t.customerName}</p>
                  {t.serviceLabel && <p className="truncate text-[11px] text-secondary">{t.serviceLabel}</p>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label={locale === "fa" ? "قبلی" : locale === "de" ? "Zurück" : "Назад"}
            className="press flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-purple-900 transition-colors hover:border-purple-600 hover:text-purple-600"
          >
            <ArrowRight size={15} weight="bold" className="rotate-180 rtl:rotate-0" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label={locale === "fa" ? "بعدی" : locale === "de" ? "Weiter" : "Далее"}
            className="press flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-purple-900 transition-colors hover:border-purple-600 hover:text-purple-600"
          >
            <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
