"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { gsap } from "gsap";

/**
 * Wraps a primary CTA link so it pulls slightly toward the cursor on
 * hover and springs back on leave — decorative, not functional, which is
 * exactly when this kind of mouse-tracked motion earns its keep (Emil
 * Kowalski's "spring-based mouse interactions": fine for a button, wrong
 * for anything a user reads data off). Deliberately applied to only the
 * page's 3 primary filled CTAs (Hero, ConsultationBanner, FinalCta) — not
 * every button — so it stays a signal ("this is THE action here"), not
 * ambient texture. A plain wrapping `<span>` rather than touching each
 * call site's own `<Link>`, so none of their existing styling/props
 * change — this only adds a transform on top.
 */
export function MagneticCta({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const enabled = useRef(true);

  function handleMove(e: MouseEvent<HTMLSpanElement>) {
    if (!enabled.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, { x: relX * strength, y: relY * strength, duration: 0.4, ease: "power3.out" });
  }

  function handleLeave() {
    if (!enabled.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  }

  function handleEnter() {
    // Read once per hover rather than once on mount — matchMedia's own
    // value can't change mid-session, but this keeps the check adjacent
    // to where it's used rather than needing a separate effect.
    enabled.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  return (
    <span ref={ref} onMouseEnter={handleEnter} onMouseMove={handleMove} onMouseLeave={handleLeave} className="inline-block">
      {children}
    </span>
  );
}
