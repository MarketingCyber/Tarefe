"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

/**
 * Before / after, drag to compare: the same smile without dental insurance (a missing
 * front tooth) and with it (the tooth implanted — one of the things the insurance pays for).
 *
 * `pos` is how much of the "without insurance" photo is showing from the left edge, 0–100.
 * It is written straight to the DOM on every pointer move (no React re-render per frame);
 * React only learns which side is winning, to swap the caption. The slider itself is a
 * left-to-right island even on RTL pages, so left/right always mean the same thing.
 *
 * The grip sits low (over the chin), not at mid-height, so it never covers the teeth.
 *
 * Input: pointer down anywhere on the photo moves the handle there and starts a drag
 * (touch-action: pan-y keeps vertical page scrolling working on phones); the handle is a
 * keyboard slider (arrows ±5, Home/End). Motion: one introduction on first view — the handle
 * sweeps across the gap and settles in the middle — cancelled the moment the visitor touches
 * it; the two corner labels animate the handle to their side. Reduced motion: no sweep, jumps.
 */
const START = 82; // the gap is clearly visible before anyone touches anything
const EASE = "power3.out";

export interface SliderCopy {
  without: string;
  with: string;
  withoutAlt: string;
  withAlt: string;
  drag: string;
  captionWithout: string;
  captionWith: string;
  sliderLabel: string;
}

export function InsuranceSlider({ copy }: { copy: SliderCopy }) {
  const box = useRef<HTMLDivElement>(null);
  const topLayer = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLSpanElement>(null);
  const labelL = useRef<HTMLButtonElement>(null);
  const labelR = useRef<HTMLButtonElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const pos = useRef(START);
  const dragging = useRef(false);
  const touched = useRef(false);
  const tween = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);
  const [side, setSide] = useState<"without" | "with">("without");

  const apply = useCallback((p: number) => {
    const v = Math.min(100, Math.max(0, p));
    pos.current = v;
    if (topLayer.current) topLayer.current.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    if (handle.current) {
      handle.current.style.left = `${v}%`;
      handle.current.setAttribute("aria-valuenow", String(Math.round(v)));
    }
    if (labelL.current) labelL.current.style.opacity = v > 16 ? "1" : "0";
    if (labelR.current) labelR.current.style.opacity = v < 84 ? "1" : "0";
    // A little hysteresis around the middle, so a handle resting near 50 cannot flicker the caption.
    if (v > 53) setSide("without");
    else if (v < 47) setSide("with");
  }, []);

  const markTouched = useCallback(() => {
    if (touched.current) return;
    touched.current = true;
    tween.current?.kill();
    tween.current = null;
    if (hint.current) hint.current.style.opacity = "0";
  }, []);

  const moveTo = useCallback(
    (target: number, duration = 0.45) => {
      markTouched();
      tween.current?.kill();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return apply(target);
      const o = { v: pos.current };
      tween.current = gsap.to(o, { v: target, duration, ease: EASE, onUpdate: () => apply(o.v) });
    },
    [apply, markTouched],
  );

  const fromPointer = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    apply(((clientX - r.left) / r.width) * 100);
  };

  // initial paint + the one-time introduction when the slider first scrolls into view
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || touched.current) return;
        io.disconnect();
        mm.add("(prefers-reduced-motion: no-preference)", () => {
          const o = { v: pos.current };
          const tl = gsap.timeline({ delay: 0.7, defaults: { onUpdate: () => apply(o.v) } });
          tl.to(o, { v: 22, duration: 1.1, ease: "power2.inOut" }).to(o, { v: 50, duration: 0.8, ease: EASE });
          tween.current = tl;
        });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      mm.revert();
      tween.current?.kill();
    };
  }, [apply]);

  const release = () => {
    dragging.current = false;
    if (grip.current) grip.current.style.transform = "";
  };

  return (
    <div className="mx-auto w-full max-w-[34rem]" dir="ltr">
      <div
        ref={box}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          markTouched();
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          if (grip.current) grip.current.style.transform = "scale(1.08)";
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) fromPointer(e.clientX);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        className="relative aspect-square w-full cursor-ew-resize select-none overflow-hidden rounded-[2rem] border-4 border-white bg-tint shadow-[0_34px_70px_-38px_rgba(93,0,137,0.6)] [touch-action:pan-y]"
      >
        {/* bottom layer: with insurance */}
        <Image src="/images/dental/with-insurance.webp" alt={copy.withAlt} fill sizes="(min-width: 1024px) 34rem, 92vw" draggable={false} className="pointer-events-none object-cover" />

        {/* top layer: without insurance, revealed from the left edge up to the handle */}
        <div ref={topLayer} className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - START}% 0 0)` }}>
          <Image src="/images/dental/without-insurance.webp" alt={copy.withoutAlt} fill sizes="(min-width: 1024px) 34rem, 92vw" draggable={false} className="object-cover" />
        </div>

        {/* corner labels double as shortcuts: tap one to slide to that photo */}
        <button
          ref={labelL}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => moveTo(94)}
          className="press absolute left-3 top-3 z-20 rounded-full bg-purple-900/80 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm transition-opacity duration-200 sm:text-sm"
        >
          {copy.without}
        </button>
        <button
          ref={labelR}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => moveTo(6)}
          className="press absolute right-3 top-3 z-20 rounded-full bg-yellow-500 px-3.5 py-1.5 text-xs font-bold text-purple-900 transition-opacity duration-200 sm:text-sm"
        >
          {copy.with}
        </button>

        {/* the handle: a keyboard slider */}
        <div
          ref={handle}
          role="slider"
          tabIndex={0}
          aria-label={copy.sliderLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={START}
          aria-valuetext={side === "with" ? copy.captionWith : copy.captionWithout}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 15 : 5;
            let next: number | null = null;
            if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pos.current - step;
            else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pos.current + step;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = 100;
            if (next === null) return;
            e.preventDefault();
            markTouched();
            apply(next);
          }}
          className="group absolute inset-y-0 z-10 w-0 outline-none"
          style={{ left: `${START}%` }}
        >
          <span className="pointer-events-none absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_14px_rgba(36,20,38,0.35)]" />
          <span
            ref={grip}
            className="pointer-events-none absolute left-0 top-[78%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-0.5 rounded-full bg-white text-purple-600 shadow-[0_10px_26px_-6px_rgba(36,20,38,0.55)] ring-purple-600/40 transition-transform duration-150 ease-out group-focus-visible:ring-4"
          >
            <CaretLeft size={14} weight="bold" />
            <CaretRight size={14} weight="bold" />
          </span>
        </div>

        <span ref={hint} className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-purple-900 shadow-sm transition-opacity duration-300">
          <CaretLeft size={11} weight="bold" aria-hidden />
          {copy.drag}
          <CaretRight size={11} weight="bold" aria-hidden />
        </span>
      </div>

      {/* What you are looking at. Both captions are always in the DOM, stacked in one grid cell, and cross-fade
          (opacity only, interruptible): no remount, and the block is as tall as the taller caption, so nothing below moves. */}
      <div className="mt-5 grid text-center text-base font-semibold leading-snug text-purple-900" aria-live="polite" dir="auto">
        <p aria-hidden={side !== "without"} className={`col-start-1 row-start-1 transition-opacity duration-200 ease-out motion-reduce:transition-none ${side === "without" ? "opacity-100" : "opacity-0"}`}>
          {copy.captionWithout}
        </p>
        <p aria-hidden={side !== "with"} className={`col-start-1 row-start-1 transition-opacity duration-200 ease-out motion-reduce:transition-none ${side === "with" ? "opacity-100" : "opacity-0"}`}>
          {copy.captionWith}
        </p>
      </div>
    </div>
  );
}
