"use client";

import { useSyncExternalStore, type ReactNode } from "react";

// No subscription actually needed — prefers-reduced-motion can change
// mid-session, but re-flowing the marquee live if someone toggles it in
// OS settings isn't worth tracking; this just needs the value once,
// consistently, without the setState-in-an-effect pattern (which
// eslint-plugin-react-hooks flags, and which really would risk a
// cascading extra render for something this cheap to read directly).
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getServerSnapshot() {
  return false; // SSR/no-JS: the static wrapped-list fallback.
}

/**
 * The one place on the homepage a *looping* animation is appropriate —
 * everywhere else on this page, motion fires once (scroll-in, hover,
 * click); a continuous loop is normally exactly what Emil Kowalski's
 * framework warns against (things seen often shouldn't move on their own
 * repeatedly). A logo strip is the standard exception: it's background
 * texture nobody is meant to focus on or read top-to-bottom, not a
 * control competing for attention.
 *
 * Renders as a single, plain wrapped row by default (matches this
 * component's pre-marquee layout exactly) — SSR, no-JS, and
 * prefers-reduced-motion all get that same static, fully-legible list,
 * nothing silently clipped or duplicated-but-frozen. Only once mounted JS
 * confirms motion is wanted does it swap to the actual scrolling track, at
 * which point content is duplicated once so the loop wraps seamlessly.
 *
 * ## Two RTL bugs, both fixed here
 *
 * Under `direction: rtl` (inherited from `<html lang="fa" dir="rtl">`) a
 * flex row lays its children out from the RIGHT, so the first DOM child
 * (real content) landed on the right and the `aria-hidden` duplicate — only
 * ever meant to fill the seam while off-screen — sat on the left, in view,
 * at rest. Separately, an overflowing block child anchors to its
 * container's *start* edge, which under RTL is the right edge, so the track
 * hung off the LEFT of the viewport instead of the right. The translateX
 * loop is purely physical and unaffected by `dir`, so it kept translating
 * left into territory past the end of the real content — a growing blank
 * gap. `dir="ltr"` on the wrapper fixes both at once (the track inherits
 * it): logos have no reading order, so pinning their layout direction
 * costs nothing, and Unicode bidi shaping is per text run, not per
 * container, so any text inside still renders correctly either way.
 *
 * ## How many copies, and why two was never enough
 *
 * This was the actual, long-hunted bug — not the animation at all. The
 * track travels exactly one copy-width per cycle, so at the end of a cycle
 * the visible window spans track coordinates [C, C+V] (C = one copy, V =
 * viewport). With only two copies the track ends at 2C, so the window runs
 * off the end whenever V > C, and a blank region V-C wide opens along the
 * trailing edge — logos simply stop arriving, then everything snaps back.
 * Measured live at a 1845px viewport with C=1189px: a 656px void every
 * lap. Narrow windows hid it (no gap while V <= C), which is why it read
 * as intermittent and survived every fix aimed at the animation
 * mechanism — the mechanism was correct the whole time, there just wasn't
 * enough content to fill a wide screen.
 *
 * `repeat` copies fixes it generally: the window stays inside the track
 * for any V <= (repeat-1) * C. At 6 copies that's ~5900px here — every
 * real monitor, ultrawides included. Travel per cycle is still exactly one
 * copy, so `duration` still means seconds-per-copy and the speed is
 * unchanged by the copy count.
 *
 * ## Why the shift percentage is exact
 *
 * Only if every copy is identical in width, which needs callers to put
 * spacing in each item's own horizontal padding, never a container
 * `gap-x-*`: N items get N-1 gaps, so N copies get N*count-1, leaving the
 * track short of a whole multiple and the shift landing before the next
 * copy actually starts. With per-item padding each item is a
 * self-contained (content + spacing) unit, the track is exactly
 * repeat * count units, and 100/repeat % is exact by construction — no
 * measurement, no ResizeObserver, no JS touching the animation. (The
 * custom property below is static: derived from a constant prop, written
 * once by React alongside animation-duration, never mutated afterwards.)
 */
export function Marquee({
  children,
  duration = 28,
  repeat = 6,
  className,
}: {
  children: ReactNode;
  duration?: number;
  repeat?: number;
  className?: string;
}) {
  const animate = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!animate) {
    return <div className={`flex flex-wrap justify-center ${className ?? ""}`}>{children}</div>;
  }

  return (
    <div dir="ltr" className="overflow-hidden">
      <div
        className={`animate-marquee flex w-max ${className ?? ""}`}
        style={{ animationDuration: `${duration}s`, "--marquee-shift": `${100 / repeat}%` } as React.CSSProperties}
      >
        {children}
        {Array.from({ length: Math.max(0, repeat - 1) }).map((_, i) => (
          <div key={i} aria-hidden="true" className={`flex ${className ?? ""}`}>
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
