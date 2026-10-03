"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { scrollToFormField } from "@/lib/scroll-to-form";

const REVEAL_THRESHOLD_PX = 480; // roughly "past the hero's own CTA"

/**
 * Sticky CTA for acquisition pages (CLP/PLP/PDP/comparison) — per Phase 2
 * §28 "Acquisition pages should have an easily accessible درخواست مشاوره
 * رایگان CTA" and §20's mobile-specific pattern list.
 *
 * Two builds from the same reveal/scroll logic: a full-width bottom bar on
 * mobile (`sm:hidden`), and a compact floating pill on desktop
 * (`hidden sm:flex`) anchored to the corner rather than spanning the
 * width — a full-width bar reads as an alarming takeover on a wide
 * viewport, where there's no header-CTA-scrolling-away problem to solve
 * quite as urgently. Desktop still had the header CTA at all times before
 * this, but that scrolls out of view too on an 11-section PDP; without
 * this, someone convinced in section 3 has to scroll past 8 more sections
 * to find a way to act on it.
 *
 * Motivated entrance (Phase 2 GSAP/motion principle: never constant or
 * decorative) — it slides in only once the visitor has scrolled past the
 * page's own primary CTA, the moment it actually stops being redundant.
 * Motion (not GSAP) to match every other UI-state animation in this
 * codebase — GSAP here is reserved for the hero's own orchestrated
 * entrance (see HeroEntrance.tsx), a deliberate, established split.
 */
export function StickyConsultationCta({
  locale,
  dict,
  href,
  scrollTargetId,
}: {
  locale: Locale;
  dict: Dictionary;
  href?: string;
  /** When set, the CTA scrolls to this in-page element (e.g. an embedded lead form) instead of navigating away — keeps the visitor on the page they're already reading. */
  scrollTargetId?: string;
}) {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setVisible(window.scrollY > REVEAL_THRESHOLD_PX);
        frame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:hidden"
        initial={false}
        animate={{ y: visible ? 0 : "100%" }}
        transition={{ type: "spring", duration: reduce ? 0 : 0.35, bounce: 0.1 }}
      >
        {scrollTargetId ? (
          <button
            type="button"
            onClick={() => scrollToFormField(scrollTargetId)}
            className="press flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 py-3 text-sm font-semibold text-white"
          >
            {dict.cta.freeConsultation}
            <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
          </button>
        ) : (
          <Link
            href={href ?? `/${locale}/consultation`}
            className="press flex items-center justify-center gap-2 rounded-full bg-purple-600 py-3 text-sm font-semibold text-white"
          >
            {dict.cta.freeConsultation}
            <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
          </Link>
        )}
      </motion.div>

      <motion.div
        className="fixed bottom-6 end-6 z-30 hidden sm:block"
        initial={false}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12, scale: visible ? 1 : 0.96 }}
        style={{ pointerEvents: visible ? "auto" : "none" }}
        transition={{ duration: reduce ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] }}
      >
        {scrollTargetId ? (
          <button
            type="button"
            onClick={() => scrollToFormField(scrollTargetId)}
            className="press flex items-center gap-2 rounded-full bg-purple-600 py-3.5 ps-5 pe-4 text-sm font-semibold text-white shadow-card-hover transition-colors hover:bg-purple-900"
          >
            {dict.cta.freeConsultation}
            <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
          </button>
        ) : (
          <Link
            href={href ?? `/${locale}/consultation`}
            className="press flex items-center gap-2 rounded-full bg-purple-600 py-3.5 ps-5 pe-4 text-sm font-semibold text-white shadow-card-hover transition-colors hover:bg-purple-900"
          >
            {dict.cta.freeConsultation}
            <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
          </Link>
        )}
      </motion.div>
    </>
  );
}
