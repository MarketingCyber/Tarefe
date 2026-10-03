"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";

/**
 * A real 3D card-turn between two faces — built as a plain `rotateY`
 * tween with `backface-visibility: hidden`, not GSAP's (capital-F) Flip
 * plugin, which animates an element between two *DOM/layout* states
 * (size, position) rather than performing a literal card-turn; that's the
 * right tool for a different job than this one.
 *
 * Click/tap to flip, not hover — ui-ux-pro-max flags "reliance on hover
 * only" as a touch-accessibility anti-pattern, and this card's back face
 * (the actual feature list) would otherwise be permanently unreachable on
 * a phone, which is most of this site's real traffic. A real `<button>`
 * with `aria-pressed`, not a bare div with an onClick, so the state is
 * announced to assistive tech too.
 */
export function FlipCard({ front, back, flipHint, className }: { front: ReactNode; back: ReactNode; flipHint: string; className?: string }) {
  const [flipped, setFlipped] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const target = flipped ? 180 : 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el, { rotateY: target });
      return;
    }
    gsap.to(el, { rotateY: target, duration: 0.6, ease: "power3.inOut" });
    // Same class of real, found-live failure as HeroEntrance's settle
    // fallback: if the rAF ticker this tween depends on is suspended for
    // any reason at the moment of the click, the card can silently end
    // up stuck showing whichever face it started on while its own
    // aria-pressed state has already flipped — landing the correct end
    // state directly, cheap insurance the click always visibly does
    // something.
    const settle = window.setTimeout(() => gsap.set(el, { rotateY: target }), 900);
    return () => window.clearTimeout(settle);
  }, [flipped]);

  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
      aria-label={flipHint}
      className={`block w-full text-start ${className ?? ""}`}
      style={{ perspective: 1200 }}
    >
      <div ref={innerRef} className="relative" style={{ transformStyle: "preserve-3d" }}>
        <div style={{ backfaceVisibility: "hidden" }}>{front}</div>
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          {back}
        </div>
      </div>
    </button>
  );
}
