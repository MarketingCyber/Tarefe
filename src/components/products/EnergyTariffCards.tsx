"use client";

import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { gsap } from "gsap";
import { useReducedMotion } from "motion/react";
import { Crown, ArrowRight } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import evdLogo from "@/assets/logos/evd.png";
import rheinEnergieLogo from "@/assets/logos/rheinenergie.svg";
import eWieEinfachLogo from "@/assets/logos/e-wie-einfach.svg";
import markELogo from "@/assets/logos/mark-e.webp";
import vattenfallLogo from "@/assets/logos/vattenfall.png";
import eweLogo from "@/assets/logos/ewe.svg";
import enviaMLogo from "@/assets/logos/envia-m.svg";
import eprimoLogo from "@/assets/logos/eprimo.svg";

// Keyed by EnergyTariff.provider exactly as stored — see
// scripts/replace-energy-tariffs.ts and scripts/add-energy-tariffs.ts, the
// only places that write these strings. A provider not in this map (a
// hand-entered tariff with no logo on file yet) falls back to its plain
// name text below, never a broken image. ewe.svg/envia-m.svg pulled
// 2026-10-08 straight from each provider's own live site (ewe.de's inline
// header SVG, enviam.de's own logo asset URL) — real brand color confirmed
// via computed style, not guessed.
const PROVIDER_LOGOS: Record<string, StaticImageData> = {
  EVD: evdLogo,
  RheinEnergie: rheinEnergieLogo,
  "E WIE EINFACH": eWieEinfachLogo,
  "Mark-E": markELogo,
  Vattenfall: vattenfallLogo,
  EWE: eweLogo,
  "Envia M": enviaMLogo,
  Eprimo: eprimoLogo,
};

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
  fa: "(در مبلغ ماهانه بالا لحاظ شده)",
  de: "(bereits im Monatsbetrag oben berücksichtigt)",
  ru: "(уже учтён в сумме выше)",
};
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
                <p className="font-latin text-3xl font-extrabold text-purple-900">
                  ≈ {Math.round(t.monthly).toLocaleString("de-DE")} <span className="text-base font-semibold">€</span>
                </p>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-secondary">
                <li className="flex items-baseline justify-between gap-2">
                  <span>{WORKING_PRICE_LABEL[locale]}</span>
                  <span className="font-latin text-body">{t.workingPriceCtPerKwh} ct/kWh</span>
                </li>
                <li className="flex items-baseline justify-between gap-2">
                  <span>{BASE_PRICE_LABEL[locale]}</span>
                  <span className="font-latin text-body">{t.basePriceMonthly.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </li>
                {t.bonusEur && (
                  <li className="flex items-baseline justify-between gap-2">
                    <span>{BONUS_LABEL[locale]}</span>
                    <span className="text-body">
                      {/* font-latin on the amount only, not the whole value
                          (found 2026-10-08) — it was wrapping
                          BONUS_INCLUDED_NOTE too, and font-latin has no
                          Farsi/Cyrillic glyphs, so that note silently
                          rendered in the browser's fallback font instead
                          of the site's own. Same root cause as the PLZ
                          placeholder and kWh-formatting comments elsewhere
                          in this codebase — font-latin must never wrap
                          anything but the actual Latin/numeric run. */}
                      <span className="font-latin">{t.bonusEur} €</span> <span className="text-secondary">{BONUS_INCLUDED_NOTE[locale]}</span>
                    </span>
                  </li>
                )}
              </ul>

              {t.priceGuaranteeMonths && <p className="mt-3 text-[11px] font-medium text-purple-600">{GUARANTEE_LABEL[locale](t.priceGuaranteeMonths)}</p>}
              {t.highlight && <p className="mt-1.5 text-[11px] leading-relaxed text-secondary">{t.highlight}</p>}

              <ConsultationCtaLink
                href={consultationHref}
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
