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

  // which section is "current"
  useEffect(() => {
    const els = ORDER.map((k) => document.getElementById(JOURNEY_IDS[k])).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const key = ORDER.find((k) => JOURNEY_IDS[k] === hit.target.id);
        if (key) setActive(key);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.01, 0.1, 0.5, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // reading progress, from the first stop to the end of the last
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const first = document.getElementById(JOURNEY_IDS.calculator);
      const last = document.getElementById(JOURNEY_IDS.faq);
      const bar = progressRef.current;
      if (!first || !last || !bar) return;
      const start = first.getBoundingClientRect().top + window.scrollY;
      const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
      const p = end > start ? (window.scrollY - start) / (end - start) : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // keep the current chip visible inside the (phone-width) scroller
  useEffect(() => {
    const track = trackRef.current;
    const chip = track?.querySelector<HTMLElement>(`[data-stop="${active}"]`);
    if (!track || !chip || track.scrollWidth <= track.clientWidth) return;
    const target = chip.offsetLeft - (track.clientWidth - chip.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: "smooth" });
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
