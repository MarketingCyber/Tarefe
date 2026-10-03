"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";

/**
 * One orchestrated entrance for the single most important moment on the
 * site — the hero. The headline splits word-by-word (GSAP SplitText) as
 * the true first beat, eyebrow/subtitle/CTAs/image follow in one
 * continuous timeline rather than racing it as a separate block-fade, and
 * the "بینم واجد شرایط هستم" badge gets its own bouncier landing at the
 * end — it's shaped like a notification/confirmation, so a small
 * overshoot-settle reads as "this just got verified", not just decoration
 * for its own sake. Not a "floating" ambient loop, not applied to
 * anything the user will see more than once per visit.
 *
 * Animates `y`/`scale` only, never `opacity` (2026-10-01, a real
 * regression found via PageSpeed Insights, not a hypothetical one) — the
 * previous version `gsap.set()` everything to opacity:0 the instant this
 * effect ran, then animated back to 1. On a fast machine that's
 * imperceptible; on throttled mobile, real content that had already
 * server-rendered and painted got SNAPPED invisible the moment JS finally
 * hydrated, then took another 1.5-2s+ to animate back — Lighthouse's
 * mobile trace showed a fully blank page past 2s and couldn't register an
 * LCP at all (NO_LCP), meaning real visitors on an average phone were
 * looking at a blank hero, CTA included, for multiple seconds. Content
 * now stays visible and readable through every step of this effect no
 * matter how slow or delayed hydration is — a skipped/interrupted/slow
 * animation now just means "didn't nudge up a few px", never "invisible".
 *
 * Plain `matchMedia(...).matches` for prefers-reduced-motion, not
 * `gsap.matchMedia()` (the pattern every other GSAP moment on this page
 * uses) — found live, not assumed: registering the SplitText plugin and
 * wrapping its usage in a `gsap.matchMedia().add()` callback silently
 * breaks that callback from ever firing at all (isolated with a chain of
 * window-global checkpoints — matchMedia's own `.add()` call completed
 * without throwing, but the callback itself never ran), while the exact
 * same wrapper pattern works correctly everywhere else on this page that
 * doesn't touch SplitText. SplitText's own registration writes to
 * `gsap.core.context` internally, which is very likely what
 * `gsap.matchMedia()` relies on for its own callback scheduling — a
 * one-time mount animation doesn't need matchMedia's live
 * media-query-change re-evaluation anyway, so sidestepping the wrapper
 * entirely is the simpler fix, not just a workaround.
 */
export function HeroEntrance({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const items = root.querySelectorAll<HTMLElement>("[data-hero-item]");
    const badge = root.querySelector<HTMLElement>("[data-hero-badge]");
    let split: InstanceType<typeof SplitText> | null = null;

    // Content is visible by default (nothing above hides it) — this effect
    // only ever adds a subtle entrance on top of that, so there's no
    // "recover to visible" failure mode left to guard here the way the
    // opacity-based version needed. Still wrapped in try/catch: SplitText
    // mutating the DOM (wrapping each word in spans) is exactly the kind
    // of operation worth not letting take the rest of the page down with
    // it if it throws.
    try {
      const headline = root.querySelector<HTMLElement>("[data-hero-headline]");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      gsap.registerPlugin(SplitText);
      const tl = gsap.timeline();

      // Isolated in its own try/catch: if SplitText fails for any reason,
      // the headline just keeps its plain server-rendered text (still
      // fully readable) instead of a failure here cancelling the rest of
      // the entrance (items/badge) — those are set up below unconditionally.
      let splitOk = false;
      if (headline) {
        try {
          split = new SplitText(headline, { type: "words" });
          gsap.set(split.words, { y: 14 });
          tl.to(split.words, { y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05 });
          splitOk = true;
        } catch {
          split = null;
        }
      }

      gsap.set(items, { y: 16 });
      tl.to(items, { y: 0, duration: 0.5, ease: "power2.out", stagger: 0.08 }, splitOk ? "-=0.25" : 0);

      if (badge) {
        gsap.set(badge, { scale: 0.5, y: 10 });
        tl.to(badge, { scale: 1, y: 0, duration: 0.7, ease: "back.out(1.8)" }, "-=0.2");
      }
    } catch {
      gsap.set(items, { y: 0, clearProps: "transform" });
      if (badge) gsap.set(badge, { y: 0, scale: 1, clearProps: "transform" });
      // TS narrows `split` to `never` here (control-flow analysis across
      // the nested try/catch above, not a real logic issue) — explicit
      // cast rather than fighting the inference.
      (split as InstanceType<typeof SplitText> | null)?.revert();
      split = null;
    }

    // Belt-and-suspenders beyond the try/catch above: a hidden/
    // backgrounded tab doesn't throw anything, it just suspends the rAF
    // ticker every GSAP tween depends on to progress — a real, observed
    // failure mode (found live), not a hypothetical one. Lower stakes now
    // than when this gated opacity (worst case before was "permanently
    // invisible"; worst case now is "sits 16px low forever"), but still
    // worth cleaning up rather than leaving a tween stuck mid-transform.
    const settle = window.setTimeout(() => {
      gsap.set(items, { y: 0, clearProps: "transform" });
      if (badge) gsap.set(badge, { y: 0, scale: 1, clearProps: "transform" });
      if (split) gsap.set(split.words, { y: 0, clearProps: "transform" });
    }, 2500);

    return () => {
      window.clearTimeout(settle);
      split?.revert();
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
