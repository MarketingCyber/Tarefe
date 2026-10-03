"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";

const STEPS = [
  { fa: "شرایطت را می‌گویی", de: "Sie schildern Ihre Situation", ru: "Вы описываете ситуацию" },
  { fa: "مقایسه می‌کنیم", de: "Wir vergleichen", ru: "Мы сравниваем" },
  { fa: "انتخاب می‌کنی", de: "Sie entscheiden", ru: "Вы выбираете" },
  { fa: "قرارداد ثبت می‌شود", de: "Der Vertrag wird abgeschlossen", ru: "Договор оформляется" },
  { fa: "کنارت می‌مانیم", de: "Wir bleiben an Ihrer Seite", ru: "Мы остаёмся рядом" },
];

// A real sequence (numbered, fixed order) is the one legitimate reason for
// numbered markers at all — this literally is a 5-step process. The sine
// wave makes that sequence read as a single continuous path rather than 5
// disconnected dots: each step sits exactly at a crest or trough the curve
// actually passes through, alternating up/down, so the shape isn't
// decorative — it's the one true sine function sampled through those 5
// points, not an approximated squiggle.
const VB_W = 1000;
const VB_H = 220;
const MARGIN_X = 100;
const AMPLITUDE = 65;
const CENTER_Y = VB_H / 2;

function buildJourney(mirror: boolean) {
  const span = VB_W - MARGIN_X * 2;
  const n = STEPS.length;
  const xAt = (t: number) => {
    const x = MARGIN_X + t * span;
    return mirror ? VB_W - x : x;
  };
  const yAt = (t: number) => CENTER_Y - AMPLITUDE * Math.cos(t * (n - 1) * Math.PI);

  const markers = STEPS.map((_, i) => {
    const t = i / (n - 1);
    return { x: xAt(t), y: yAt(t) };
  });

  const samples = 160;
  const points: string[] = [];
  for (let s = 0; s <= samples; s++) {
    const t = s / samples;
    points.push(`${s === 0 ? "M" : "L"}${xAt(t).toFixed(2)},${yAt(t).toFixed(2)}`);
  }

  return { markers, d: points.join(" ") };
}

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export function HowItWorks({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  // RTL journeys run right-to-left, matching the page's own reading flow —
  // step 1 starts on the right, step 5 lands on the left.
  const mirror = locale === "fa";
  const { markers, d } = useMemo(() => buildJourney(mirror), [mirror]);

  useEffect(() => {
    const section = sectionRef.current;
    const path = pathRef.current;
    if (!section || !path) return;
    const mm = gsap.matchMedia();

    mm.add({ reduceMotion: "(prefers-reduced-motion: reduce)", desktop: "(min-width: 768px)" }, (context) => {
      const { reduceMotion, desktop } = (context as unknown as { conditions: { reduceMotion: boolean; desktop: boolean } }).conditions;
      const numbers = section.querySelectorAll<HTMLElement>("[data-step-number]");

      if (reduceMotion || !desktop) {
        gsap.set(path, { strokeDashoffset: 0 });
        gsap.set(numbers, { scale: 1, opacity: 1 });
        return;
      }

      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(numbers, { scale: 0.5, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top 70%", once: true },
      });
      tl.to(path, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut" });
      tl.to(numbers, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)", stagger: 0.25 }, 0.15);
    });

    return () => mm.revert();
  }, [mirror]);

  return (
    <section ref={sectionRef} className="py-16 md:py-24">
      <div className="container-page">
        <h2 className="text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.howTitle}</h2>
        <p className="mt-2 max-w-[55ch] text-sm text-secondary md:text-base">{dict.home.howSubtitle}</p>

        {/* Desktop: the sine-wave journey. Line-draws on scroll-in (once),
            numbers pop along it as the curve reaches them. */}
        <div className="relative mt-16 hidden pb-16 md:block" style={{ aspectRatio: `${VB_W} / ${VB_H}` }}>
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 h-full w-full overflow-visible" fill="none" aria-hidden="true">
            <path ref={pathRef} d={d} stroke="#5d0089" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
          {markers.map((m, i) => (
            <div key={STEPS[i].fa}>
              {/* Centered on the path point by itself — the earlier version
                  centered the whole circle+title block here, which put the
                  visible node (the circle) noticeably above the actual
                  curve, since the title text below it pulled the block's
                  own center down. The circle is the thing that's supposed
                  to sit on the line; the title is just labeling it. */}
              {/* The last node breaks from purple to gold — not
                  decoration, a structural signal. Steps 1-4 are a
                  sequence that ends; step 5 ("we stay with you") is the
                  one that doesn't, so it reads as a different kind of
                  step, not just the last one counted. */}
              <span
                data-step-number
                className={`font-latin absolute flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold shadow-card ${
                  i === STEPS.length - 1 ? "bg-yellow-500 text-purple-900" : "bg-purple-600 text-white"
                }`}
                style={{ left: `${(m.x / VB_W) * 100}%`, top: `${(m.y / VB_H) * 100}%`, transform: "translate(-50%, -50%)" }}
              >
                {i + 1}
              </span>
              <p
                className="absolute max-w-[14ch] text-center text-sm font-semibold text-purple-900"
                style={{ left: `${(m.x / VB_W) * 100}%`, top: `calc(${(m.y / VB_H) * 100}% + 34px)`, transform: "translateX(-50%)" }}
              >
                {STEPS[i][locale]}
              </p>
            </div>
          ))}
        </div>

        {/* Mobile: same journey, vertical — a wide sine curve doesn't fit a
            narrow viewport, so it collapses to a plain numbered line. */}
        <ol className="mt-10 flex flex-col gap-5 md:hidden">
          {STEPS.map((step, i) => (
            <li key={step.fa} className="flex items-center gap-3">
              <span
                className={`font-latin flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === STEPS.length - 1 ? "bg-yellow-500 text-purple-900" : "bg-purple-600 text-white"
                }`}
              >
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-purple-900">{step[locale]}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
