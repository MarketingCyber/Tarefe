"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, ArrowRight } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import type { Locale } from "@/lib/taxonomy";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { EnergyTariffCards, type TariffCardData } from "@/components/products/EnergyTariffCards";

/**
 * How much of the viewport's top/bottom edges are covered by fixed/sticky
 * chrome (the sticky Navbar header, StickyConsultationCta's mobile bottom
 * bar) — a naive `window.innerHeight`-based center lands the winner card
 * behind that chrome, worst on mobile where the bottom bar alone is ~140px.
 * Scans for currently-pinned elements rather than hardcoding selectors, so
 * it stays correct if that chrome's height changes or other sticky/fixed
 * UI gets added later.
 */
function getOccludedViewportBand(): { top: number; bottom: number } {
  if (typeof document === "undefined") return { top: 0, bottom: 0 };
  const vh = window.visualViewport?.height ?? window.innerHeight;
  let top = 0;
  let bottom = 0;
  for (const node of document.body.querySelectorAll<HTMLElement>("*")) {
    const style = window.getComputedStyle(node);
    if (style.position !== "fixed" && style.position !== "sticky") continue;
    if (style.visibility === "hidden" || style.display === "none") continue;
    const rect = node.getBoundingClientRect();
    if (rect.height === 0 || rect.width === 0) continue;
    if (rect.top <= 1 && rect.bottom > 0) {
      top = Math.max(top, rect.bottom);
    } else if (rect.bottom >= vh - 1 && rect.top < vh) {
      bottom = Math.max(bottom, vh - rect.top);
    }
  }
  return { top, bottom };
}

/**
 * Resolves once the visual viewport stops changing (or after maxWaitMs) —
 * clicking the CTA blurs the just-typed-into PLZ/consumption input, which
 * dismisses the mobile keyboard asynchronously. Measuring immediately after
 * the click captures a transient mid-resize height, which is what made the
 * "center" land ~220px off on mobile despite the math itself being correct.
 */
function waitForViewportStable(maxWaitMs = 400): Promise<void> {
  return new Promise((resolve) => {
    // requestAnimationFrame is paused by the browser while the tab/pane is
    // backgrounded (e.g. the visitor switches apps right after tapping the
    // CTA) — an rAF-only wait can then never resolve. This timer is the
    // fallback that fires regardless, so the scroll never just hangs.
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timeoutId = setTimeout(done, maxWaitMs);

    const vv = window.visualViewport;
    if (!vv) {
      requestAnimationFrame(() => requestAnimationFrame(done));
      return;
    }
    let lastHeight = vv.height;
    let stableFrames = 0;
    const check = () => {
      if (settled) return;
      const h = vv.height;
      if (Math.abs(h - lastHeight) < 1) {
        stableFrames++;
      } else {
        stableFrames = 0;
        lastHeight = h;
      }
      if (stableFrames >= 2) {
        clearTimeout(timeoutId);
        done();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

type HouseholdSize = 1 | 2 | 3 | 4;

/**
 * Average annual consumption (kWh) without electric water heating — the
 * more typical case for German apartments (gas/district heating usually
 * covers hot water). Source: Vattenfall's own consumer guide, checked
 * 2026-08-28: https://www.vattenfall.de/infowelt-energie/strom-ratgeber/durchschnittlicher-stromverbrauch-im-1-2-3-4-personen-haushalt
 * "4" is used as the floor for "4 or more" — no verified figure exists
 * for 5-person households, and per-person consumption falls as household
 * size grows, so extrapolating upward would overstate it.
 */
const HOUSEHOLD_AVERAGE_KWH: Record<HouseholdSize, number> = { 1: 1800, 2: 2700, 3: 3500, 4: 3800 };

type DwellingSize = "upTo50" | "size50to80" | "size80to120" | "size120to150" | "over150";

/**
 * Gas heating consumption scales with dwelling size (m²) and heating
 * behavior, not household headcount — per-person figures were checked and
 * rejected for exactly this reason (2026-08-28: GASAG's own guide gave a
 * 2-person estimate of 9,600–12,800 kWh but a "1-person" figure two orders
 * of magnitude off that range — internally inconsistent, not usable).
 * Dwelling size is a genuinely different, self-consistent axis: BDEW/
 * Heizspiegel's annual analysis (90,000+ German buildings) gives a flat
 * ~160 kWh/m²/year for combined heating+hot-water gas usage, checked
 * 2026-09-28: https://gasberechnen.de/durchschnittlicher-gasverbrauch/ —
 * bands below use each range's upper bound × 160 (the source's own
 * methodology), "over150" uses 200m² as a representative reference point
 * for the open-ended top band. ±30-50% variance from insulation/building
 * age/behavior is real and disclosed in gasEstimateNote below, same as
 * electricity's own "this is just an estimate" disclaimer.
 */
const GAS_DWELLING_KWH: Record<DwellingSize, number> = {
  upTo50: 8000,
  size50to80: 12800,
  size80to120: 19200,
  size120to150: 24000,
  over150: 32000,
};

// Named for what the tool actually finds — the best tariff for this
// visitor's own numbers — not for the consumption figure it collects
// along the way (2026-10-01, was "...verbrauchsrechner" / "محاسبه‌گر
// مصرف..." in every locale, which named the input step, not the output).
const TITLE: Record<Locale, Record<"electricity" | "gas", string>> = {
  fa: { electricity: "بهترین تعرفه برق را پیدا کن", gas: "بهترین تعرفه گاز را پیدا کن" },
  de: { electricity: "Den besten Stromtarif finden", gas: "Den besten Gastarif finden" },
  ru: { electricity: "Найдите лучший тариф на электричество", gas: "Найдите лучший тариф на газ" },
};

const LABELS: Record<
  Locale,
  {
    plzLabel: string;
    plzPlaceholder: string;
    plzInvalid: string;
    estimateToggleNote: string;
    knownToggleNote: string;
    knownLabel: string;
    householdLabel: string;
    householdOption: (n: number) => string;
    dwellingLabel: string;
    dwellingOption: (size: DwellingSize) => string;
    resultAnnual: string;
    disclaimer: string;
    sourceNote: string;
    gasSourceNote: string;
    calculateCta: string;
    calculateCtaLoading: string;
    cta: string;
    noTariffNote: string;
    noCoverageNote: string;
    lookupErrorNote: string;
    /** Shown once, directly under the title — not just a placeholder for
     * the empty state anymore (2026-10-01) — so the tool's purpose ("give
     * me your usage, I'll find the real price") is stated before anyone
     * even reaches the PLZ field. */
    subtitle: string;
  }
> = {
  fa: {
    plzLabel: "کد پستی (PLZ)",
    plzPlaceholder: "مثلاً 40221",
    plzInvalid: "کد پستی باید ۵ رقم باشد.",
    estimateToggleNote: "مصرف سالانه‌ات رو نمی‌دونی؟ کلیک کن.",
    knownToggleNote: "مصرف سالانه دقیقت رو می‌دونی؟ کلیک کن و مستقیم واردش کن.",
    knownLabel: "مصرف سالانه (کیلووات‌ساعت)",
    householdLabel: "تعداد افراد خانه",
    householdOption: (n) => (n === 4 ? "۴ نفر یا بیشتر" : `${n.toLocaleString("fa-IR")} نفر`),
    dwellingLabel: "متراژ خانه",
    dwellingOption: (size) =>
      ({
        upTo50: "تا ۵۰ متر مربع",
        size50to80: "۵۰ تا ۸۰ متر مربع",
        size80to120: "۸۰ تا ۱۲۰ متر مربع",
        size120to150: "۱۲۰ تا ۱۵۰ متر مربع",
        over150: "بیش از ۱۵۰ متر مربع",
      })[size],
    resultAnnual: "مصرف تخمینی سالانه",
    disclaimer: "این فقط یک برآورد است؛ مصرف واقعی بسته به نوع گرمایش، لوازم خانگی و عادت مصرف متفاوت است.",
    sourceNote: "میانگین مصرف بر اساس راهنمای مصرف Vattenfall (بدون گرمایش آب با برق).",
    gasSourceNote: "میانگین مصرف بر اساس تحلیل سالانه Heizspiegel/BDEW از بیش از ۹۰ هزار ساختمان در آلمان — مصرف واقعی بسته به عایق‌بندی و قدمت ساختمان تا ۳۰ تا ۵۰ درصد متفاوت است.",
    calculateCta: "مقایسه گزینه‌ها",
    calculateCtaLoading: "در حال محاسبه…",
    cta: "دریافت مشاوره رایگان برای این مصرف",
    noTariffNote: "برای این خدمت هنوز تعرفه واقعی برای محاسبه دقیق قبض ثبت نشده — مشاور ما بر اساس این مصرف بهترین گزینه را پیدا می‌کند.",
    noCoverageNote: "هیچ‌کدام از تعرفه‌های ثبت‌شده برای این کد پستی مشخص فعال نیستند — مشاور ما گزینه‌های واقعی موجود در منطقه‌ات را برایت پیدا می‌کند.",
    lookupErrorNote: "مشکلی در دریافت قیمت‌ها پیش آمد. دوباره امتحان کن یا مستقیم با ما مشورت کن.",
    subtitle: "مصرف سالانه‌ات را وارد کن تا ببینیم کدام تعرفه واقعاً برات به‌صرفه‌تره.",
  },
  de: {
    plzLabel: "Postleitzahl (PLZ)",
    plzPlaceholder: "z. B. 40221",
    plzInvalid: "Die Postleitzahl muss 5-stellig sein.",
    estimateToggleNote: "Sie kennen Ihren Jahresverbrauch nicht? Klicken Sie hier.",
    knownToggleNote: "Sie kennen Ihren genauen Jahresverbrauch? Klicken Sie hier und geben Sie ihn direkt ein.",
    knownLabel: "Jahresverbrauch (kWh)",
    householdLabel: "Haushaltsgröße",
    householdOption: (n) => (n === 4 ? "4 Personen oder mehr" : `${n} Person${n > 1 ? "en" : ""}`),
    dwellingLabel: "Wohnfläche",
    dwellingOption: (size) =>
      ({
        upTo50: "Bis 50 m²",
        size50to80: "50–80 m²",
        size80to120: "80–120 m²",
        size120to150: "120–150 m²",
        over150: "Über 150 m²",
      })[size],
    resultAnnual: "Geschätzter Jahresverbrauch",
    disclaimer: "Dies ist nur eine Schätzung; der tatsächliche Verbrauch hängt von Heizungsart, Geräten und Nutzungsgewohnheiten ab.",
    sourceNote: "Durchschnittswerte laut Vattenfall-Verbrauchsratgeber (ohne Strom-Warmwasserbereitung).",
    gasSourceNote: "Durchschnittswerte laut Heizspiegel/BDEW-Jahresanalyse von über 90.000 Gebäuden in Deutschland — der tatsächliche Verbrauch weicht je nach Dämmung und Baujahr um 30–50 % ab.",
    calculateCta: "Optionen vergleichen",
    calculateCtaLoading: "Wird berechnet…",
    cta: "Kostenlose Beratung für diesen Verbrauch",
    noTariffNote: "Für diesen Bereich ist noch kein realer Tarif für eine genaue Kostenschätzung hinterlegt — unser Berater findet die passende Option auf Basis dieses Verbrauchs.",
    noCoverageNote: "Für diese Postleitzahl ist aktuell keiner der hinterlegten Tarife verfügbar — unser Berater findet die real verfügbaren Optionen für Ihre Region.",
    lookupErrorNote: "Beim Abrufen der Preise ist ein Fehler aufgetreten. Bitte erneut versuchen oder direkt beraten lassen.",
    subtitle: "Geben Sie Ihren Jahresverbrauch ein, damit wir sehen, welcher Tarif für Sie wirklich günstiger ist.",
  },
  ru: {
    plzLabel: "Почтовый индекс (PLZ)",
    plzPlaceholder: "напр. 40221",
    plzInvalid: "Индекс должен состоять из 5 цифр.",
    estimateToggleNote: "Не знаете годовое потребление? Нажмите здесь.",
    knownToggleNote: "Знаете точное годовое потребление? Нажмите и введите его напрямую.",
    knownLabel: "Годовое потребление (кВт·ч)",
    householdLabel: "Количество человек",
    householdOption: (n) => (n === 4 ? "4 человека и более" : `${n} чел.`),
    dwellingLabel: "Площадь жилья",
    dwellingOption: (size) =>
      ({
        upTo50: "До 50 м²",
        size50to80: "50–80 м²",
        size80to120: "80–120 м²",
        size120to150: "120–150 м²",
        over150: "Более 150 м²",
      })[size],
    resultAnnual: "Оценочное годовое потребление",
    disclaimer: "Это лишь оценка; фактическое потребление зависит от типа отопления, техники и привычек.",
    sourceNote: "Средние значения по данным справочника Vattenfall (без электрического нагрева воды).",
    gasSourceNote: "Средние значения по годовому анализу Heizspiegel/BDEW более 90 000 зданий в Германии — фактическое потребление отличается на 30–50% в зависимости от утепления и года постройки.",
    calculateCta: "Сравнить варианты",
    calculateCtaLoading: "Идёт расчёт…",
    cta: "Бесплатная консультация с учётом этого расхода",
    noTariffNote: "Для этой услуги пока нет реального тарифа для точного расчёта — консультант подберёт вариант на основе этого потребления.",
    noCoverageNote: "Ни один из указанных тарифов сейчас недоступен для этого почтового индекса — консультант подберёт реальные варианты для вашего региона.",
    lookupErrorNote: "Не удалось получить цены. Попробуйте ещё раз или сразу обратитесь за консультацией.",
    subtitle: "Укажите годовое потребление, чтобы увидеть, какой тариф действительно выгоднее для вас.",
  },
};

export function EnergyConsumptionCalculator({
  locale,
  kind,
  consultationHref,
  tariffs,
  pricingMode = "static",
  hasAnyTariffs,
}: {
  locale: Locale;
  /** Both kinds have an "estimate" quick-pick mode — electricity by
   * household size, gas by dwelling size (see GAS_DWELLING_KWH above for
   * why gas uses a different axis than electricity). */
  kind: "electricity" | "gas";
  consultationHref: string;
  /** Static (PDP) mode only — a pre-resolved, already-priced set of cards,
   * used as-is with no network lookup. Ignored entirely in "live" mode. */
  tariffs?: TariffCardData[];
  /** "static" (default): render `tariffs` as given, no PLZ dependency —
   * the PDP's single known-tariff example, price fixed regardless of
   * postal code. "live": PLP mode — real German energy prices vary by
   * postal code and usage tier (see EnergyTariffPriceRow in
   * schema.prisma), so pricing is resolved per-visitor via
   * /api/energy-tariffs/lookup once they've entered both PLZ and
   * consumption, instead of being fetched once at page load for everyone. */
  pricingMode?: "static" | "live";
  /** Live mode only — whether this kind has any published tariff at all
   * (regardless of postal-code coverage), to distinguish "nothing
   * registered for this service yet" from "registered, but not in your
   * area" (the latter only becomes known after a lookup). */
  hasAnyTariffs?: boolean;
}) {
  const t = LABELS[locale];
  const reduceMotion = useReducedMotion();
  const [plz, setPlz] = useState("");
  // Manual entry is the default for both kinds (2026-10-01) — a visitor
  // who already knows their usage shouldn't have to notice and tap a mode
  // switch first; the guided (household/dwelling) estimate is now reached
  // via a quiet grey toggle note below the field instead of competing with
  // the PLZ field for attention as a prominent segmented control.
  const [mode, setMode] = useState<"estimate" | "known">("known");
  const [householdSize, setHouseholdSize] = useState<HouseholdSize>(2);
  // "size80to120" is the middle band of the 5 options — same role as
  // electricity's "2" default, a reasonable starting point to adjust from
  // rather than an assertion about the typical German dwelling.
  const [dwellingSize, setDwellingSize] = useState<DwellingSize>("size80to120");
  const [knownKwh, setKnownKwh] = useState("");

  const plzValid = plz === "" || /^\d{5}$/.test(plz);
  const plzComplete = /^\d{5}$/.test(plz);

  const annualKwh = useMemo(() => {
    if (mode === "known") {
      const n = parseFloat(knownKwh);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return kind === "electricity" ? HOUSEHOLD_AVERAGE_KWH[householdSize] : GAS_DWELLING_KWH[dwellingSize];
  }, [mode, knownKwh, householdSize, dwellingSize, kind]);

  // Cards stay hidden behind an explicit CTA rather than appearing the
  // instant annualKwh has a value — electricity's "estimate" mode always
  // has *some* value from its very first render (the household-size
  // default), so a purely reactive reveal would show price cards before
  // anyone actually asked for a comparison. Once revealed, later input
  // changes (household size, a new known-kWh value, PLZ) update the same
  // visible cards live — only the *first* reveal needs the click.
  const [hasCalculated, setHasCalculated] = useState(false);
  const [liveCards, setLiveCards] = useState<TariffCardData[] | null>(null);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "error">("idle");

  const winnerCardRef = useRef<HTMLDivElement>(null);

  // Live mode: (re-)fetch real prices for this PLZ + consumption whenever
  // either changes, but only after the visitor has actually asked for a
  // comparison once (hasCalculated) — same "click once, then reactive"
  // contract as static mode's cards, see comment above.
  useEffect(() => {
    if (pricingMode !== "live" || !hasCalculated || !plzComplete || !annualKwh) return;
    let cancelled = false;
    const params = new URLSearchParams({ kind: kind.toUpperCase(), plz, annualKwh: String(annualKwh), locale });
    // "loading" is set from inside the .then/.catch chain, never directly
    // in the effect body — a synchronous setState call at the top of an
    // effect triggers a cascading extra render (react-hooks/set-state-in-effect).
    Promise.resolve()
      .then(() => {
        if (cancelled) return Promise.reject(new Error("cancelled"));
        setLookupStatus("loading");
        return fetch(`/api/energy-tariffs/lookup?${params}`);
      })
      .then((res) => {
        if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
        return res.json();
      })
      .then((data: { cards: TariffCardData[] }) => {
        if (cancelled) return;
        setLiveCards(data.cards);
        setLookupStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setLookupStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pricingMode/kind/locale are stable per mount, hasCalculated is the trigger, plz/annualKwh are the real deps
  }, [hasCalculated, plz, plzComplete, annualKwh]);

  // Live mode only: whether a calculate attempt was blocked on a missing
  // PLZ, so the field can nudge the visitor toward it instead of the gold
  // CTA silently doing nothing — found live (2026-09-28): gating the CTA's
  // very *visibility* on PLZ meant a visitor who never noticed that field
  // (electricity's "estimate" mode already has a consumption value from
  // its household-size default, so nothing else demands attention) saw no
  // CTA and no cards at all, indistinguishable from the feature being gone.
  const [plzRequiredHint, setPlzRequiredHint] = useState(false);
  const plzRef = useRef<HTMLInputElement>(null);
  const knownKwhRef = useRef<HTMLInputElement>(null);

  // Same walk-them-to-what's-missing pattern for consumption as for PLZ
  // below — "known" mode starts empty (gas always uses it; electricity's
  // "estimate" mode never needs this branch, it always has a value from
  // the household-size default).
  function handleCalculate() {
    if (pricingMode === "live" && !annualKwh) {
      knownKwhRef.current?.focus();
      return;
    }
    if (pricingMode === "live" && !plzComplete) {
      setPlzRequiredHint(true);
      plzRef.current?.focus();
      return;
    }
    setHasCalculated(true);
  }

  // Live mode: the gold CTA is always there once real tariffs exist for
  // this kind at all — never hidden just because consumption or PLZ
  // aren't filled in yet (both are enforced at click-time, above), so gas
  // (which never has a default consumption value) presents the same
  // "one clear action" shape electricity's pre-filled default gets for
  // free. Static (PDP) mode is unchanged — it always has both already.
  const showGoldCta = pricingMode === "live" ? hasAnyTariffs !== false : !!annualKwh && (tariffs?.length ?? 0) > 0;
  const showNoTariffNote = pricingMode === "live" ? hasAnyTariffs === false : (tariffs?.length ?? 0) === 0;
  const showNoCoverageNote = pricingMode === "live" && hasCalculated && lookupStatus === "idle" && liveCards !== null && liveCards.length === 0;
  const showLookupError = pricingMode === "live" && lookupStatus === "error";
  const cardsToRender = pricingMode === "live" ? (liveCards ?? []) : (tariffs ?? []);
  // Requiring annualKwh here (not just a non-empty cardsToRender) matters
  // once results are already showing: switching to "known" mode clears the
  // input, so annualKwh goes null while liveCards still holds the PREVIOUS
  // lookup's cards — without this check they stayed on screen and
  // EnergyTariffCards recomputed their monthly price with a null annualKwh,
  // which JS arithmetic coerces to 0, silently showing just the base price
  // as if consumption were zero. Found live: a visitor changing inputs
  // after seeing results saw a wrong, too-low price instead of the cards
  // clearing until they entered a new value.
  const showCards = hasCalculated && !!annualKwh && cardsToRender.length > 0;
  const plzShowError = !plzValid || (plzRequiredHint && !plzComplete);

  // The gold CTA only ever shows pre-calculation (see its own render
  // condition below) — once hasCalculated flips true it never comes back,
  // on the assumption that cards stay visible and update live from here.
  // That assumption breaks whenever showCards goes false again after the
  // first calculation (no coverage for a new PLZ, a lookup error, or —
  // found live — switching to "known" mode and clearing the field): with
  // neither the gold CTA nor this fallback, the visitor was left looking
  // at a blank area with literally nothing clickable. `lookupStatus !==
  // "loading"` keeps this from flashing in during every ordinary
  // recalculation's brief in-flight moment, when cardsToRender still holds
  // the previous (valid) results and showCards is still true anyway.
  const showFallbackCta = !showGoldCta || (hasCalculated && !showCards && lookupStatus !== "loading");

  // Scrolls to the WINNER card specifically (center of viewport), not just
  // "the cards area" — triggered once the cards actually render, not once
  // hasCalculated flips true: in live mode those aren't the same moment
  // (cards only exist after the async lookup resolves), so gating on
  // hasCalculated alone meant this ran before there was anything to
  // scroll to and silently did nothing.
  useEffect(() => {
    if (!showCards || !winnerCardRef.current) return;
    let cancelled = false;

    // Native window.scrollTo({behavior:"smooth"}) instead of GSAP's
    // ScrollToPlugin — GSAP's tween is driven by its own rAF-based ticker,
    // which can silently stall (tab briefly backgrounded, a missed frame
    // under load) and never reach the target at all; a real visitor
    // reported exactly that ("won't force scroll") after this worked in
    // testing. The browser's own smooth-scroll runs on the compositor, not
    // JS, so it can't stall the same way — reliability over custom easing
    // here. Still centers within the actually-visible band (viewport minus
    // sticky/fixed chrome), not raw window.innerHeight — see
    // getOccludedViewportBand — and waits for the post-click keyboard-dismiss
    // resize to settle first — see waitForViewportStable.
    void waitForViewportStable().then(() => {
      if (cancelled) return;
      const el = winnerCardRef.current;
      if (!el) return;

      const { top: occludedTop, bottom: occludedBottom } = getOccludedViewportBand();
      const visibleHeight = window.innerHeight - occludedTop - occludedBottom;
      const rect = el.getBoundingClientRect();
      const elCenterY = rect.top + window.scrollY + rect.height / 2;
      const targetY = elCenterY - occludedTop - visibleHeight / 2;
      window.scrollTo({ top: Math.max(0, targetY), behavior: reduceMotion ? "auto" : "smooth" });
    });

    return () => {
      cancelled = true;
    };
  }, [showCards, reduceMotion]);

  return (
    <div className="rounded-2xl border border-purple-600/30 bg-white p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-purple-900">
        <Calculator size={20} weight="duotone" className="text-purple-600" />
        {TITLE[locale][kind]}
      </h2>
      <p className="mt-1.5 text-sm text-secondary">{t.subtitle}</p>

      {/* Single column, deliberately not side-by-side (2026-10-01) — PLZ is
          the first thing a visitor should register, consumption the
          second, each getting its own undistracted row instead of
          competing for attention next to a mode switch. The guided
          (household/dwelling) estimate used to be a prominent purple
          segmented control sitting directly beside PLZ; it's now a quiet
          grey toggle note under the consumption field itself (below), so
          nothing outranks PLZ -> consumption in what a visitor notices first. */}
      <div className="mt-5 grid gap-5">
        <div className="grid gap-1.5">
          <label htmlFor="plz" className="text-xs font-semibold text-body">
            {t.plzLabel}
          </label>
          {/* No font-latin here (found 2026-08-31) — the typed value is always
              digits, but plzPlaceholder mixes a translated word with them
              ("مثلاً 40221" / "напر. 40221"), and font-latin has no Farsi/
              Cyrillic glyphs at all — the word portion of the placeholder
              silently fell back to the browser's own default font instead
              of the site's. IRANSansX renders Latin digits fine on its own,
              so the page's normal font already covers both. */}
          <input
            ref={plzRef}
            id="plz"
            inputMode="numeric"
            maxLength={5}
            value={plz}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setPlz(digits);
              if (digits.length === 5) setPlzRequiredHint(false);
            }}
            placeholder={t.plzPlaceholder}
            // text-base, not text-sm (2026-10-01) — iOS Safari force-zooms
            // the whole page on focus for any input under 16px, which on a
            // real iPhone both caused a horizontal-scroll-inducing zoom on
            // its own AND threw off the viewport-geometry math the
            // scroll-to-results effect below depends on (visualViewport
            // dimensions shrink under pinch-zoom but getBoundingClientRect
            // doesn't scale with it), so results looked like they "didn't
            // show up" — they rendered, just scrolled to the wrong place
            // while the page was still zoomed in. sm:text-sm reverts to the
            // normal size once the viewport is wide enough that iOS's
            // zoom-on-focus isn't a factor.
            className={`rounded-lg border bg-white px-3.5 py-2.5 text-base text-purple-900 outline-none transition-colors focus:ring-2 focus:ring-purple-600/25 sm:text-sm ${
              plzShowError ? "border-danger" : "border-border-strong focus:border-purple-600"
            }`}
          />
          {plzShowError && <p className="text-xs text-danger">{t.plzInvalid}</p>}
        </div>

        {mode === "estimate" && kind === "electricity" ? (
          <div className="grid gap-1.5">
            <label htmlFor="household" className="text-xs font-semibold text-body">
              {t.householdLabel}
            </label>
            <select
              id="household"
              value={householdSize}
              onChange={(e) => setHouseholdSize(Number(e.target.value) as HouseholdSize)}
              className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-base text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25 sm:text-sm"
            >
              {([1, 2, 3, 4] as HouseholdSize[]).map((n) => (
                <option key={n} value={n}>
                  {t.householdOption(n)}
                </option>
              ))}
            </select>
          </div>
        ) : mode === "estimate" && kind === "gas" ? (
          <div className="grid gap-1.5">
            <label htmlFor="dwelling" className="text-xs font-semibold text-body">
              {t.dwellingLabel}
            </label>
            <select
              id="dwelling"
              value={dwellingSize}
              onChange={(e) => setDwellingSize(e.target.value as DwellingSize)}
              className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-base text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25 sm:text-sm"
            >
              {(["upTo50", "size50to80", "size80to120", "size120to150", "over150"] as DwellingSize[]).map((size) => (
                <option key={size} value={size}>
                  {t.dwellingOption(size)}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <label htmlFor="knownKwh" className="text-xs font-semibold text-body">
              {t.knownLabel}
            </label>
            <input
              ref={knownKwhRef}
              id="knownKwh"
              type="number"
              min={0}
              inputMode="decimal"
              value={knownKwh}
              onChange={(e) => setKnownKwh(e.target.value)}
              className="font-latin rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-base text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25 sm:text-sm"
            />
          </div>
        )}

        {/* The entire reason the segmented toggle is gone — same action
            (switch mode), but grey and text-sized so it reads as a quiet
            offramp for the minority who don't know their number, not a
            second decision everyone has to make before they can start. */}
        <button
          type="button"
          onClick={() => setMode(mode === "known" ? "estimate" : "known")}
          className="justify-self-start text-start text-[11px] text-secondary transition-colors hover:text-purple-600 hover:underline"
        >
          {mode === "known" ? t.estimateToggleNote : t.knownToggleNote}
        </button>
      </div>

      {/* Gated purely on annualKwh now (2026-10-01) — the "enter your
          consumption" guidance used to live in this box's empty state so
          live mode had *something* here before a value existed; that
          guidance is now the subtitle under the title instead, so there's
          nothing left for an empty version of this box to say. */}
      {!!annualKwh && (
        <div className="mt-5 rounded-xl bg-tint p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-secondary">{t.resultAnnual}</span>
            {/* Always de-DE grouping, never locale === "fa" ? "fa-IR" : ... —
                toLocaleString("fa-IR") renders Persian digit glyphs (۰-۹),
                which font-latin (Inter) has none of, so the browser silently
                falls back to a different font for just those characters
                (found 2026-09-26, "fonts messed up" in the fa calculator —
                same root cause the PLZ input's own comment above already
                warns about for placeholder text). */}
            <span className="font-latin text-lg font-bold text-purple-900">{Math.round(annualKwh).toLocaleString("de-DE")} kWh</span>
          </div>
          {showNoTariffNote && <p className="mt-2 text-xs text-secondary">{t.noTariffNote}</p>}
          {showNoCoverageNote && <p className="mt-2 text-xs text-secondary">{t.noCoverageNote}</p>}
          {showLookupError && <p className="mt-2 text-xs text-danger">{t.lookupErrorNote}</p>}
          {mode === "estimate" && <p className="mt-3 text-[11px] text-secondary">{kind === "electricity" ? t.sourceNote : t.gasSourceNote}</p>}
          <p className="mt-1 text-[11px] text-secondary">{t.disclaimer}</p>
        </div>
      )}

      {/* The one thing to do next, and the only place on this calculator
          that isn't purple — gold is this site's "notice this specifically"
          accent (see docs/design-system.md's 60/30/10 rule), used
          everywhere else only for the winner card's crown badge and similar
          single callouts, never for a default action. Larger than every
          other control here and full-width on mobile, so it's the obvious
          next step at a glance rather than one button among several. */}
      {showGoldCta && !hasCalculated && (
        <button
          type="button"
          onClick={handleCalculate}
          disabled={lookupStatus === "loading"}
          className="calculate-cta-pulse press mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-500 px-6 py-4 text-base font-bold text-purple-900 shadow-card-hover transition-transform hover:scale-[1.02] disabled:opacity-70 sm:w-auto"
        >
          <Calculator size={20} weight="bold" />
          {lookupStatus === "loading" ? t.calculateCtaLoading : t.calculateCta}
          <ArrowRight size={16} weight="bold" className="rtl:rotate-180" />
        </button>
      )}

      {showCards && (
        <div className="mt-5">
          <EnergyTariffCards
            locale={locale}
            tariffs={cardsToRender}
            annualKwh={annualKwh!}
            consultationHref={consultationHref}
            winnerRef={winnerCardRef}
          />
        </div>
      )}

      {/* Only when there's genuinely no "see the options" action available —
          see showFallbackCta's own comment above for the full list of
          cases this now covers. Once the gold CTA or the cards themselves
          are showing, this would just be a second, competing button — each
          card already carries its own specific consultation link. */}
      {showFallbackCta && (
        <ConsultationCtaLink
          href={consultationHref}
          className="press mt-5 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900"
        >
          {t.cta}
          <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
        </ConsultationCtaLink>
      )}
    </div>
  );
}
