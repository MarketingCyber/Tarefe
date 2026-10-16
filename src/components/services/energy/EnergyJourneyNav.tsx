"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import type { EnergyPageContent } from "@/lib/energy-page-content";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { JOURNEY_IDS, JOURNEY_ORDER as ORDER, type JourneyStop } from "./journey";

/**
 * The map of the page. The electricity / gas pages are long and the visitor's
 * question changes as they read (what will I pay → why act now → can I switch →
 * how does it work → can I trust them → what if…), so a slim bar sticks under
 * the header listing those stops in order, highlights the one on screen, and
 * jumps to any of them. A hairline under it fills as the page is read.
 *
 * - Scroll-spy via IntersectionObserver on the sections' ids (a band across the
 *   middle of the viewport decides which one is "current").
 * - Phones: the chips scroll sideways inside the bar and the current one is kept
 *   in view; the CTA hides (the sticky bottom bar already carries it).
 * - The progress line is written straight to a ref's transform from a passive
 *   scroll listener — no React state on scroll.
 * - Clicking jumps instantly: this is navigation the visitor asked for, so no
 *   long animated scroll (sections carry scroll-margin-top for the sticky chrome).
 */
export function EnergyJourneyNav({ locale, nav, formId }: { locale: Locale; nav: EnergyPageContent["journey"]["nav"]; formId: string }) {
  const [active, setActive] = useState<JourneyStop>("calculator");
  const barRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const lockRef = useRef(false);
  const lockTimer = useRef<number | null>(null);
  const scheduleRef = useRef<(() => void) | null>(null);

  // Which stop is "current", and how far the reader is — recomputed from the real section
  // positions on every scroll frame. (First version used IntersectionObserver ratios; with tall
  // sections and a thin trigger band it flickered between stops.) The rule is simple and
  // monotone: the current stop is the LAST one whose top has passed a line a quarter of the way
  // down the viewport, below the sticky chrome. While the page is scrolling because the visitor
  // CLICKED a chip (the site scrolls smoothly), the spy is paused so the highlight does not
  // flash through every stop on the way; it resumes when the scroll ends.
  useEffect(() => {
    // Runs straight from the scroll event (browsers already deliver at most one per frame) — no
    // requestAnimationFrame hop, which is paused entirely in a hidden tab and added a frame of lag.
    const compute = () => {
      // progress hairline: first stop → end of the last stop
      const first = document.getElementById(JOURNEY_IDS.calculator);
      const last = document.getElementById(JOURNEY_IDS[ORDER[ORDER.length - 1]]);
      const bar = progressRef.current;
      if (first && last && bar) {
        const start = first.getBoundingClientRect().top + window.scrollY;
        const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, end > start ? (window.scrollY - start) / (end - start) : 0))})`;
      }

      if (lockRef.current) return;
      const chromeBottom = barRef.current?.getBoundingClientRect().bottom ?? 120;
      const line = chromeBottom + window.innerHeight * 0.25;
      let current: JourneyStop = ORDER[0];
      for (const key of ORDER) {
        const el = document.getElementById(JOURNEY_IDS[key]);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = key;
        else break;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const schedule = compute;
    scheduleRef.current = schedule;
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // sections change height while the page loads (images, the live chart, the calculator results)
    const ro = new ResizeObserver(schedule);
    ORDER.forEach((k) => {
      const el = document.getElementById(JOURNEY_IDS[k]);
      if (el) ro.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      scheduleRef.current = null;
    };
  }, []);

  // A chip was clicked: highlight it now, hold the spy until the smooth scroll has finished.
  const onChipClick = (key: JourneyStop) => {
    setActive(key);
    lockRef.current = true;
    if (lockTimer.current) window.clearTimeout(lockTimer.current);
    const release = () => {
      lockRef.current = false;
      scheduleRef.current?.();
    };
    window.addEventListener("scrollend", release, { once: true });
    lockTimer.current = window.setTimeout(release, 1400); // fallback for browsers without scrollend
  };

  // Keep the current chip visible inside the (phone-width) scroller. Uses screen coordinates, so it is the
  // same in left-to-right and right-to-left pages (scrollLeft is negative in RTL), and only ever moves the chip row.
  useEffect(() => {
    const track = trackRef.current;
    const chip = track?.querySelector<HTMLElement>(`[data-stop="${active}"]`);
    if (!track || !chip || track.scrollWidth <= track.clientWidth) return;
    const t = track.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    track.scrollBy({ left: c.left + c.width / 2 - (t.left + t.width / 2), behavior: "smooth" });
  }, [active]);

  return (
    <div ref={barRef} className="sticky top-16 z-40 border-b border-border bg-white/95 backdrop-blur">
      <div className="container-page flex items-center gap-3">
        <nav aria-label={byLocale(locale, { fa: "بخش‌های صفحه", de: "Abschnitte dieser Seite", ru: "Разделы страницы" })} className="min-w-0 flex-1">
          <ul ref={trackRef} className="flex gap-1.5 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ORDER.map((key, i) => {
              const on = active === key;
              return (
                <li key={key} className="shrink-0">
                  <a
                    href={`#${JOURNEY_IDS[key]}`}
                    data-stop={key}
                    onClick={() => onChipClick(key)}
                    aria-current={on ? "location" : undefined}
                    className={`press inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-150 ${
                      on ? "bg-purple-900 text-white" : "text-secondary hover:bg-tint hover:text-purple-900"
                    }`}
                  >
                    <span aria-hidden className={`font-latin flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${on ? "bg-yellow-500 text-purple-900" : "bg-purple-600/10 text-purple-600"}`}>
                      {i + 1}
                    </span>
                    {byLocale(locale, nav[key])}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <ConsultationCtaLink
          href={`#${formId}`}
          className="press hidden min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-purple-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-purple-900 md:inline-flex"
        >
          {byLocale(locale, nav.cta)}
          <ArrowRight size={13} weight="bold" className="rtl:rotate-180" />
        </ConsultationCtaLink>
      </div>
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-border/60">
        <span ref={progressRef} className="block h-full origin-left bg-purple-600 will-change-transform rtl:origin-right" style={{ transform: "scaleX(0)" }} />
      </span>
    </div>
  );
}
