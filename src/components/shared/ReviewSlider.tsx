"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowRight, Quotes } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";

/**
 * Customer comments as a manual slider (swipe, trackpad, arrow buttons, dots, or the keyboard).
 *
 * The scrolling itself is the browser's own scroll-snap track — touch and trackpad momentum,
 * keyboard arrows on the focused track, and RTL all come for free; the buttons and dots only
 * call scrollBy / scrollTo. State is read back from the scroll position (one rAF-throttled
 * passive listener), so there is no animation loop to fight the browser. Previous / next are
 * disabled at the ends; the dots show where you are and jump to a card. Smooth scrolling is
 * switched off under prefers-reduced-motion. The cards fade/rise in once, the first time the
 * slider scrolls into view (GSAP, skipped under reduced motion).
 *
 * Sizes: one card plus a peek of the next on a phone (a visible hint that it scrolls), about
 * three on a wide screen. Everything uses start/end (logical) positions, so Persian reads
 * right-to-left with the first comment on the right.
 */
export interface ReviewItem {
  id: string;
  /** A short headline for the comment, shown above it. */
  title?: string;
  quote: string;
  name: string;
}

const BADGE_TINTS = ["bg-purple-600/10 text-purple-600", "bg-yellow-500/15 text-purple-900", "bg-success-bg text-success"];
const LABEL = {
  prev: { fa: "قبلی", de: "Zurück", ru: "Назад" },
  next: { fa: "بعدی", de: "Weiter", ru: "Далее" },
  go: { fa: "نظر شماره", de: "Kommentar", ru: "Отзыв" },
  region: { fa: "نظر مشتریان", de: "Kundenkommentare", ru: "Отзывы клиентов" },
};

export function ReviewSlider({ locale, items, header }: { locale: Locale; items: ReviewItem[]; header?: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [stops, setStops] = useState(0); // 0 until measured, so the dots never flash a wrong count
  const [edge, setEdge] = useState({ start: true, end: false });

  const step = useCallback(() => {
    const t = track.current;
    const card = t?.querySelector<HTMLElement>("[data-review-card]");
    return card ? card.offsetWidth + parseFloat(getComputedStyle(t!).columnGap || "20") : 320;
  }, []);

  /**
   * Where the track can actually rest. On a wide screen several cards are visible at once, so the
   * track runs out of room before the last card reaches the start edge: a dot per card would leave
   * the last few dots unreachable. Instead there is one stop per step plus a final stop at the very end.
   */
  const geometry = useCallback(() => {
    const t = track.current;
    const st = step();
    const max = t ? Math.max(0, t.scrollWidth - t.clientWidth) : 0;
    const pos = t ? Math.abs(t.scrollLeft) : 0;
    const count = max <= 2 ? 1 : Math.ceil((max - 2) / st) + 1;
    const atEnd = max > 2 && pos >= max - 2;
    const at = atEnd ? count - 1 : Math.min(Math.max(0, count - 2), Math.round(pos / st));
    return { st, max, pos, count, at };
  }, [step]);

  const sync = useCallback(() => {
    const g = geometry();
    setEdge({ start: g.pos <= 2, end: g.max <= 2 || g.pos >= g.max - 2 });
    setStops(g.count);
    setIndex(g.at);
  }, [geometry]);

  // read the scroll position back into state, at most once per frame
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    t.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(t);
    onScroll();
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [sync]);

  // one entrance, the first time the slider is seen
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const mm = gsap.matchMedia();
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          gsap.from(t.querySelectorAll("[data-review-card]"), { opacity: 0, y: 18, duration: 0.5, ease: "power3.out", stagger: 0.07, clearProps: "opacity,transform" });
        });
      },
      { threshold: 0.25 },
    );
    io.observe(t);
    return () => {
      io.disconnect();
      mm.revert();
    };
  }, []);

  const behavior = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
  // under RTL the scroll axis is mirrored: ask the track which way "forward" is instead of assuming
  const dirSign = () => (track.current && getComputedStyle(track.current).direction === "rtl" ? -1 : 1);
  // Absolute targets (the next card from the one in view), not relative nudges: repeated clicks can never drift off the snap points.
  const goTo = (i: number) => {
    const g = geometry();
    const stop = Math.min(g.count - 1, Math.max(0, i));
    track.current?.scrollTo({ left: dirSign() * (stop === g.count - 1 ? g.max : stop * g.st), behavior: behavior() });
  };
  const by = (dir: 1 | -1) => goTo(geometry().at + dir); // from the live position, not the (frame-delayed) state

  const btn = "press flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-white text-purple-900 transition-[color,border-color,opacity] duration-150 hover:border-purple-600 hover:text-purple-600 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">{header}</div>
        <div className="flex shrink-0 items-center gap-2" role="group" aria-label={LABEL.region[locale]}>
        <button type="button" onClick={() => by(-1)} disabled={edge.start} aria-label={LABEL.prev[locale]} className={btn}>
          <ArrowRight size={16} weight="bold" className="rotate-180 rtl:rotate-0" />
        </button>
        <button type="button" onClick={() => by(1)} disabled={edge.end} aria-label={LABEL.next[locale]} className={btn}>
          <ArrowRight size={16} weight="bold" className="rtl:rotate-180" />
        </button>
        </div>
      </div>

      <div
        ref={track}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={LABEL.region[locale]}
        className="-mx-4 flex snap-x snap-mandatory items-stretch gap-5 overflow-x-auto overflow-y-hidden scroll-px-4 px-4 pb-4 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-purple-600/40 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((it, i) => (
          <figure key={it.id} data-review-card className="relative flex w-[84%] shrink-0 snap-start flex-col gap-4 rounded-3xl border border-border bg-white p-6 shadow-card sm:w-[22rem] lg:w-[24rem]">
            <Quotes size={32} weight="fill" className="text-yellow-500/70" aria-hidden />
            {it.title && <p className="-mb-1 text-base font-bold leading-snug text-purple-900">{it.title}</p>}
            <blockquote className="flex-1 text-[15px] leading-[1.9] text-body">{it.quote}</blockquote>
            <figcaption className="flex items-center gap-3 border-t border-border pt-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${BADGE_TINTS[i % BADGE_TINTS.length]}`} aria-hidden>
                {it.name.trim().charAt(0)}
              </span>
              <span className="text-sm font-semibold text-purple-900">{it.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-2 flex min-h-6 items-center justify-center gap-1">
        {Array.from({ length: stops > 1 ? stops : 0 }, (_, i) => (
          <button key={i} type="button" onClick={() => goTo(i)} aria-label={`${LABEL.go[locale]} ${i + 1}`} aria-current={i === index} className="group flex h-6 w-6 items-center justify-center">
            <span className={`block h-2 rounded-full transition-[width,background-color] duration-200 ease-out ${i === index ? "w-6 bg-purple-600" : "w-2 bg-border-strong group-hover:bg-purple-600/50"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
