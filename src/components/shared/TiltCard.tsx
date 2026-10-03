"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";
import { gsap } from "gsap";

/**
 * A 3D tilt following the cursor — applied to ServiceCategories' four
 * real, clickable category cards. Decorative mouse-tracking, same
 * justification as MagneticCta: fine for something you're not reading
 * data off. Pointer events (not mouse) so it naturally no-ops on touch —
 * combined with an explicit `(hover: hover)` check so a touch device that
 * *does* fire a synthetic pointer event still doesn't tilt on tap.
 * `transformPerspective: 600` (closer than the CSS default) plus a 16°
 * rotation cap make the effect read clearly rather than as a faint wobble.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(true);

  function handleEnter() {
    enabled.current = window.matchMedia("(hover: hover)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!enabled.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    // transformPerspective (a GSAP-specific transform property, not plain
    // CSS) rather than a CSS `perspective` on this same element — CSS
    // perspective only affects a *child's* 3D transforms, not the
    // element carrying it, and this element is both the perspective
    // origin and the thing being rotated.
    gsap.to(el, { rotateY: px * 16, rotateX: py * -16, transformPerspective: 600, duration: 0.4, ease: "power2.out" });
  }

  function handleLeave() {
    if (!enabled.current) return;
    gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: "power3.out" });
  }

  return (
    <div
      ref={ref}
      onPointerEnter={handleEnter}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={className}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}
