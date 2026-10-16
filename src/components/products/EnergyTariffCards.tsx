"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import { Crown, ArrowRight } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { track, EVENT } from "@/lib/analytics";
import { PROVIDER_LOGOS } from "./provider-logos";


export interface TariffCardData {
  id: string;
  provider: string;
  name: string;
  workingPriceCtPerKwh: string;
  basePriceEurPerYear: string;
  bonusEur: string | null;
  priceGuaranteeMonths: number | null;
  highlight: string | null;
}

const TOP_LABEL_SINGLE: Record<Locale, string> = { fa: "پیشنهاد ما", de: "Unsere Empfehlung", ru: "Наша рекомендация" };
const TOP_LABEL_CHEAPEST: Record<Locale, string> = { fa: "ارزان‌ترین گزینه", de: "Günstigste Option", ru: "Самый выгодный вариант" };
const PER_MONTH: Record<Locale, string> = { fa: "تقریباً در ماه", de: "ca. pro Monat", ru: "ок. в месяц" };
const WORKING_PRICE_LABEL: Record<Locale, string> = { fa: "قیمت مصرف", de: "Arbeitspreis", ru: "Цена за кВт·ч" };
const BASE_PRICE_LABEL: Record<Locale, string> = { fa: "قیمت پایه ماهانه", de: "Grundpreis (monatlich)", ru: "Базовая цена (ежемесячно)" };
const BONUS_LABEL: Record<Locale, string> = { fa: "بونوس", de: "Bonus", ru: "Бонус" };
const BONUS_INCLUDED_NOTE: Record<Locale, string> = {
  fa: "در مبلغ ماهانه بالا لحاظ شده است",
  de: "Bereits im Monatsbetrag oben berücksichtigt",
  ru: "Уже учтён в сумме выше",
};

/** A bonus counts only if it is a real positive amount — "0.00" strings are common in provider exports. */
const bonusAmount = (v: string | null): number => {
  const n = v ? parseFloat(v) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** One number format for every figure on the card (comma decimals, like the Grundpreis already was) — the raw DB strings mixed "14.43", "230.00" and "14,90" side by side. */
const fmt = (n: number, minFraction = 0, maxFraction = 2) => n.toLocaleString("de-DE", { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction });
const GUARANTEE_LABEL: Record<Locale, (m: number) => string> = {
  fa: (m) => `گارانتی قیمت ${m} ماه`,
  de: (m) => `${m} Monate Preisgarantie`,
  ru: (m) => `Гарантия цены ${m} мес.`,
};
const CTA_LABEL: Record<Locale, string> = { fa: "مشاوره برای این تعرفه", de: "Beratung zu diesem Tarif", ru: "Консультация по этому тарифу" };
const ONLY_ONE_NOTE: Record<Locale, string> = {
  fa: "در حال حاضر فقط یک تعرفه واقعی برای این خدمت ثبت شده — به‌محض ثبت گزینه‌های بیشتر، اینجا مقایسه واقعی نمایش داده می‌شود.",
  de: "Für diesen Bereich ist aktuell nur ein realer Tarif hinterlegt — sobald weitere Optionen erfasst sind, erscheint hier ein echter Vergleich.",
  ru: "Для этой услуги сейчас указан только один реальный тариф — как только появятся другие варианты, здесь будет настоящее сравнение.",
};

/**
 * Two-thirds of a full rotation's worth of position, sine-perturbed:
 * position(t) = t + 0.05·sin(4πt). Monotonic (the perturbation's own
 * derivative never exceeds 1, so it never runs backwards) and closes
 * seamlessly — at every integer t, sin(4π·integer) = 0, so the value lands
 * exactly on t with no jump when the loop repeats. Passed straight to GSAP
 * as a custom ease function (progress in, progress out) rather than a
 * built-in named ease, so the rotation genuinely speeds up and slows down
 * as it goes around instead of spinning at one constant rate — "sinuous",
 * not a constant-speed loop.
 */
function sinuousEase(t: number) {
  return t + 0.05 * Math.sin(4 * Math.PI * t);
}

const REVOLUTION_SECONDS = 3.6;

/** The chasing-light border on the top card — two comet-like streaks (gold + purple, the brand's own two colors) 180° apart, rotating via GSAP. */
function WinnerGlow({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ringRef.current;
    if (reduce || !el) return;
    gsap.set(el, { transformOrigin: "50% 50%" });
    // Driven straight off gsap.ticker's elapsed time each frame, rather
    // than a single gsap.to({ rotation: 360, repeat: -1, ease: sinuousEase })
    // tween — verified live that the tween approach freezes mid-rotation
    // after the first cycle (a repeat + non-built-in custom-ease-function
    // interaction, not a browser quirk: the frozen transform was identical
    // across repeated reads seconds apart). Recomputing the angle from
    // elapsed-time-mod-duration every tick sidesteps GSAP's repeat/ease
    // machinery entirely, so there's nothing for that interaction to break.
    const tick = () => {
      const progress = (gsap.ticker.time % REVOLUTION_SECONDS) / REVOLUTION_SECONDS;
      gsap.set(el, { rotation: 360 * sinuousEase(progress) });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [reduce]);

  return (
    <div className="tariff-winner-glow h-full shadow-card-hover">
      <div ref={ringRef} className="tariff-winner-glow__ring" aria-hidden="true" />
      <div className="tariff-winner-glow__inner">{children}</div>
    </div>
  );
}

/**
 * Renders 1-N real tariffs (whatever's currently published in
 * /ops/energy-tariffs) as comparison cards, cheapest first. The top card
 * (the cheapest one, or the only one there is) always gets the highlight
 * treatment — a glowing chasing border (see WinnerGlow above) and a badge;
 * the badge reads "our recommendation" with exactly one tariff and
 * "cheapest option" once there are 2+ to genuinely compare. On desktop
 * only with exactly 3 cards, the top card is also elevated to a center
 * "podium" position — on mobile every card stacks in price order
 * regardless, so the top one is always first without any extra CSS.
 */
export function EnergyTariffCards({
  locale,
  tariffs,
  annualKwh,
  consultationHref,
  winnerRef,
}: {
  locale: Locale;
  tariffs: TariffCardData[];
  annualKwh: number;
  consultationHref: string;
  /** Attached to the winner card's own wrapper, so the calculator's
   * post-CTA scroll can center specifically on the winner — not just
   * "somewhere in the card grid" — regardless of which position it ends
   * up in (desktop reorders it to the middle column when there are 3). */
  winnerRef?: React.Ref<HTMLDivElement>;
}) {
  const reduce = useReducedMotion();

  const withEstimate = tariffs
    .map((t) => {
      const workingPrice = parseFloat(t.workingPriceCtPerKwh);
      const basePriceAnnual = parseFloat(t.basePriceEurPerYear);
      if (!Number.isFinite(workingPrice) || !Number.isFinite(basePriceAnnual)) return null;
      const bonus = t.bonusEur ? parseFloat(t.bonusEur) : 0;
      // Verbrauchspreis (annual) + Grundpreis (annual) − Bonus (one-time),
      // all divided by 12 for the average monthly bill in year one — this
      // is what was wrong before (found 2026-10-01): Grundpreis was added
      // as if it were already a monthly figure instead of annual, and the
      // sign-up Bonus wasn't netted out at all, both silently inflating
      // the "≈ pro Monat" number shown on every card.
      const annualConsumptionCost = (annualKwh * workingPrice) / 100;
      const monthly = (annualConsumptionCost + basePriceAnnual - (Number.isFinite(bonus) ? bonus : 0)) / 12;
      const basePriceMonthly = basePriceAnnual / 12;
      return { ...t, monthly, basePriceMonthly };
    })
    .filter((t): t is TariffCardData & { monthly: number; basePriceMonthly: number } => t !== null)
    .sort((a, b) => a.monthly - b.monthly)
    // Top 3 cheapest, not every tariff we have priced — found 2026-10-08,
    // 6 cards read as a dense table to compare rather than a clear
    // recommendation. Also makes the desktop "podium" layout (winner
    // elevated in the middle column) the standard view instead of a
    // special case that only applied when exactly 3 happened to exist.
    .slice(0, 3);

  if (withEstimate.length === 0) return null;

  const n = withEstimate.length;

  return (
    <div>
      {n === 1 && <p className="mb-3 text-[11px] text-secondary">{ONLY_ONE_NOTE[locale]}</p>}
      <div className={`grid gap-4 ${n === 1 ? "sm:mx-auto sm:max-w-sm" : n === 2 ? "sm:grid-cols-2" : "md:grid-cols-3 md:items-end"}`}>
        {withEstimate.map((t, sortedIndex) => {
          const isTop = sortedIndex === 0;
          const mobileOrder = sortedIndex + 1;
          const desktopOrder = n === 3 ? (sortedIndex === 0 ? 2 : sortedIndex === 1 ? 1 : 3) : mobileOrder;

          const cardBody = (
            <div className="flex h-full flex-col rounded-2xl bg-white p-5">
              {isTop && (
                <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-yellow-500 px-2.5 py-1 text-[11px] font-bold text-purple-900">
                  <Crown size={13} weight="fill" />
                  {n === 1 ? TOP_LABEL_SINGLE[locale] : TOP_LABEL_CHEAPEST[locale]}
                </span>
              )}
              {PROVIDER_LOGOS[t.provider] ? (
                <Image src={PROVIDER_LOGOS[t.provider]} alt={t.provider} className="h-7 w-auto object-contain object-left" />
              ) : (
                <p dir="ltr" className="font-latin text-start text-sm font-bold text-purple-900">
                  {t.provider}
                </p>
              )}
              {/* dir="ltr" — these are real provider/product names (German
                  or English), never translated per locale (see the fa
                  dictionary comment on this). Without it, this <p> inherits
                  the page's RTL direction on the fa locale, and
                  text-align:start then resolves to the RIGHT — reversing
                  how a Latin-script name reads, most visible on longer
                  names like "Fix Strom Direkt" wrapping oddly. */}
              <p dir="ltr" className="font-latin mt-1.5 text-start text-xs text-secondary">
                {t.name}
              </p>

              <div className="mt-4">
                <p className="text-[11px] text-secondary">{PER_MONTH[locale]}</p>
                {/* Every figure below is a dir="ltr" run inside the RTL
                    page: without it the bidi algorithm reorders "≈ 44 €"
                    into "€ 44 ≈" and "14,43 ct/kWh" into "ct/kWh 14,43"
                    on the fa locale. font-latin stays on the numeric run
                    only — never on Farsi/Cyrillic text (no glyphs there). */}
                <p className="text-3xl font-extrabold text-purple-900">
                  <span dir="ltr" className="font-latin inline-block">
                    ≈ {fmt(Math.round(t.monthly))} <span className="text-base font-semibold">€</span>
                  </span>
                </p>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-secondary">
                <li className="flex items-baseline justify-between gap-2">
                  <span>{WORKING_PRICE_LABEL[locale]}</span>
                  <span dir="ltr" className="font-latin text-body">{fmt(parseFloat(t.workingPriceCtPerKwh), 2, 3)} ct/kWh</span>
                </li>
                <li className="flex items-baseline justify-between gap-2">
                  <span>{BASE_PRICE_LABEL[locale]}</span>
                  <span dir="ltr" className="font-latin text-body">{fmt(t.basePriceMonthly, 2, 2)} €</span>
                </li>
                {/* Bonus: the amount sits in a pill on the same line as its
                    label (like every row above), and the "already counted
                    in the monthly figure" note drops to its own line
                    underneath. Before, the note shared the amount's
                    line and wrapped mid-phrase beside a "230.00" that
                    didn't even use the card's number format. */}
                {bonusAmount(t.bonusEur) > 0 && (
                  <li>
                    <div className="flex items-center justify-between gap-2">
                      <span>{BONUS_LABEL[locale]}</span>
                      <span dir="ltr" className="font-latin rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-bold text-success">
                        {fmt(bonusAmount(t.bonusEur))} €
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-secondary">{BONUS_INCLUDED_NOTE[locale]}</p>
                  </li>
                )}
              </ul>

              {t.priceGuaranteeMonths && <p className="mt-3 text-[11px] font-medium text-purple-600">{GUARANTEE_LABEL[locale](t.priceGuaranteeMonths)}</p>}
              {t.highlight && <p className="mt-1.5 text-[11px] leading-relaxed text-secondary">{t.highlight}</p>}

              <ConsultationCtaLink
                href={consultationHref}
                onClick={() => track(EVENT.TARIFF_CTA_CLICKED, { path: window.location.pathname, locale, category: "energy", metadata: { provider: t.provider, tariff: t.name, rank: sortedIndex + 1 } })}
                className={`press mt-5 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors ${
                  isTop ? "bg-purple-600 text-white hover:bg-purple-900" : "border border-border-strong text-purple-900 hover:border-purple-600"
                }`}
              >
                {CTA_LABEL[locale]}
                <ArrowRight size={13} weight="bold" className="rtl:rotate-180" />
              </ConsultationCtaLink>
            </div>
          );

          // Both breakpoints go through CSS custom properties referenced by
          // plain classes (order-[var(--x)] / md:order-[var(--y)]), never
          // inline `style.order` directly — an inline style's specificity
          // beats every class unconditionally, media query or not, so a
          // `md:order-[...]` class could never win over it at any width.
          const positioned = (children: React.ReactNode) => (
            <div
              key={t.id}
              ref={isTop ? winnerRef : undefined}
              style={{ "--tariff-order-mobile": mobileOrder, "--tariff-order-md": desktopOrder } as React.CSSProperties}
              className={`order-[var(--tariff-order-mobile)] md:order-[var(--tariff-order-md)] ${isTop && n === 3 ? "md:-translate-y-3" : ""}`}
            >
              {children}
            </div>
          );

          if (!isTop) return positioned(<div className="h-full rounded-2xl border border-border shadow-card">{cardBody}</div>);

          return positioned(
            reduce ? <div className="h-full rounded-2xl shadow-card-hover ring-2 ring-yellow-500">{cardBody}</div> : <WinnerGlow>{cardBody}</WinnerGlow>
          );
        })}
      </div>
    </div>
  );
}
