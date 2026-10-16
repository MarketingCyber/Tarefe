"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ArrowRight, CaretDown, Check, CheckCircle, Gift, Headset, ShieldCheck, WhatsappLogo } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import { LOCALE_DIR } from "@/lib/taxonomy";
import { Logo } from "@/components/layout/Logo";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";
import { PROVIDER_LOGOS } from "@/components/products/provider-logos";
import { LANDING_COPY, pick } from "@/lib/landing-copy";
import { USAGE_OPTIONS, usageFor, type LandingKind } from "@/lib/landing-estimates";
import { rankTariffs, type PricedTariff, type TariffRow } from "@/lib/tariff-estimate";
import { toAsciiDigits } from "@/lib/phone";

/**
 * The Google Ads landing journey: three screens and a thank-you, one idea each,
 * on a lot of white space.
 *
 *   1 usage   — a dropdown ("how many people / how big is your home") that is ALREADY
 *               filled with a sensible low-usage default, then the postcode
 *   2 tariffs — one big winner + two small cards, from the real tariff lookup
 *   3 request — the lead form (the same ConsultationForm every page uses, so the
 *               Google Ads form-submission trigger fires exactly as before)
 *   4 done    — what happens next
 *
 * The visitor's place and choices live in the browser history entry
 * (history.state), not in storage: Back goes to the previous step, a refresh comes
 * back to the same step, and nothing is written to the device (no consent needed).
 * Each step is counted on our own server without cookies (POST /api/landing-step),
 * because the people this page is built for rarely accept the cookie banner.
 *
 * Motion (GSAP; plain fade under prefers-reduced-motion): a new step slides in
 * ~24px from the reading direction over 280ms with a strong ease-out — enter-only,
 * never gated on an exit animation; the winner's price counts up once; the check
 * mark on the thank-you screen draws itself once. Focus moves to the step's
 * heading and the page scrolls to the top on every step.
 */

type Step = 1 | 2 | 3 | 4;
interface JState {
  step: Step;
  option: string;
  plz: string;
  chosenId: string | null;
}
type Lookup = "idle" | "loading" | "ready" | "empty" | "error";

const WHATSAPP = "https://wa.me/4915224318691";
const EASE = "power3.out";
const fmtEur = (v: number) => Math.round(v).toLocaleString("de-DE");
const fmtKwh = (v: number) => Math.round(v).toLocaleString("de-DE");

function clickIdFromUrl(): { ads: boolean; gclid?: string } {
  if (typeof window === "undefined") return { ads: false };
  const p = new URLSearchParams(window.location.search);
  const gclid = p.get("gclid");
  const other = p.get("gbraid") ? `gbraid:${p.get("gbraid")}` : p.get("wbraid") ? `wbraid:${p.get("wbraid")}` : undefined;
  return { ads: !!(gclid || other || p.get("msclkid")), gclid: gclid ?? other ?? undefined };
}

export function LandingJourney({ locale, kind }: { locale: Locale; kind: LandingKind }) {
  const rtl = LOCALE_DIR[locale] === "rtl";
  const initial: JState = useMemo(() => ({ step: 1, option: USAGE_OPTIONS[kind].default, plz: "", chosenId: null }), [kind]);
  const [state, setState] = useState<JState>(initial);
  const [plzError, setPlzError] = useState(false);
  const [lookup, setLookup] = useState<Lookup>("idle");
  const [cards, setCards] = useState<PricedTariff[]>([]);
  const [retry, setRetry] = useState(0);

  const stepRef = useRef<HTMLDivElement>(null);
  const plzRef = useRef<HTMLInputElement>(null);
  const prevStep = useRef<Step>(1);
  const firstRender = useRef(true);
  const counted = useRef(new Set<string>());
  const [click, setClick] = useState<{ ads: boolean; gclid?: string }>({ ads: false });
  const adsRef = useRef(false);
  const cardsRef = useRef<PricedTariff[]>([]);

  const usage = usageFor(kind, state.option);
  const annualKwh = usage.kwh;
  const chosen = cards.find((c) => c.id === state.chosenId) ?? null;

  // ---- counting (cookie-free; once per step per page load)
  const count = useCallback(
    (step: "usage" | "results" | "tariff" | "form" | "submitted") => {
      if (counted.current.has(step)) return;
      counted.current.add(step);
      try {
        const body = JSON.stringify({ kind, step, ads: adsRef.current });
        if (!navigator.sendBeacon?.("/api/landing-step", new Blob([body], { type: "application/json" }))) {
          fetch("/api/landing-step", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
        }
      } catch {
        // counting must never get in the visitor's way
      }
    },
    [kind],
  );

  // ---- history: the journey position lives in history.state
  useEffect(() => {
    const ids = clickIdFromUrl();
    adsRef.current = ids.ads;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the query string is only readable in the browser
    setClick(ids);
    const saved = (window.history.state as { lp?: JState } | null)?.lp;
    if (saved && saved.step >= 1 && saved.step <= 4) {
      setState({ ...initial, ...saved, step: saved.step === 4 ? 3 : saved.step });
    } else {
      window.history.replaceState({ ...(window.history.state ?? {}), lp: initial }, "");
    }
    const onPop = (e: PopStateEvent) => {
      const lp = (e.state as { lp?: JState } | null)?.lp;
      setState(lp ? { ...initial, ...lp } : initial);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initial]);

  // keep the entry in sync while the visitor edits (no new history entry for typing)
  useEffect(() => {
    if (firstRender.current) return;
    window.history.replaceState({ ...(window.history.state ?? {}), lp: state }, "");
  }, [state]);

  const go = useCallback((patch: Partial<JState> & { step: Step }) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      window.history.pushState({ ...(window.history.state ?? {}), lp: next }, "");
      return next;
    });
  }, []);

  // ---- step change: slide in, focus the heading, back to the top
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      prevStep.current = state.step;
      return;
    }
    const el = stepRef.current;
    const forward = state.step >= prevStep.current;
    prevStep.current = state.step;
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!el) return;
    el.querySelector<HTMLElement>("[data-heading]")?.focus({ preventScroll: true });
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const dx = (forward ? 1 : -1) * (rtl ? -1 : 1) * 24;
      gsap.fromTo(el, { opacity: 0, x: dx }, { opacity: 1, x: 0, duration: 0.28, ease: EASE, clearProps: "transform,opacity" });
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.15, clearProps: "opacity" });
    });
    return () => mm.revert();
  }, [state.step, rtl]);

  // ---- the real tariff lookup, whenever the visitor is on the results step
  useEffect(() => {
    // Step 2 always looks up; step 3 only when a refresh left it without the chosen tariff's data.
    if (state.step !== 2 && !(state.step === 3 && state.chosenId && cardsRef.current.length === 0)) return;
    const ctrl = new AbortController();
    const started = performance.now();
    setLookup("loading");
    const qs = new URLSearchParams({ kind: kind === "electricity" ? "ELECTRICITY" : "GAS", plz: state.plz, annualKwh: String(annualKwh), locale });
    fetch(`/api/energy-tariffs/lookup?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(async (j: { cards: TariffRow[] }) => {
        // A real search takes a moment; never flash the result in under ~600ms (it would look like nothing happened).
        const wait = 600 - (performance.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (ctrl.signal.aborted) return;
        const ranked = rankTariffs(j.cards ?? [], annualKwh, 3);
        cardsRef.current = ranked;
        setCards(ranked);
        setLookup(ranked.length ? "ready" : "empty");
        count("results");
      })
      .catch((e) => {
        if (!ctrl.signal.aborted && e?.name !== "AbortError") setLookup("error");
      });
    return () => ctrl.abort();
  }, [state.step, state.plz, state.chosenId, annualKwh, kind, locale, retry, count]);

  // ---- actions
  const submitUsage = () => {
    const plz = toAsciiDigits(state.plz).trim();
    if (!/^\d{5}$/.test(plz)) {
      setPlzError(true);
      plzRef.current?.focus();
      return;
    }
    setPlzError(false);
    count("usage");
    go({ step: 2, plz, chosenId: null });
  };
  const choose = (id: string | null) => {
    count("tariff");
    count("form");
    go({ step: 3, chosenId: id });
  };

  const landingExtra = useMemo(
    () => ({
      gclid: click.gclid,
      landing: {
        kind,
        plz: state.plz,
        usageOption: state.option,
        annualKwh,
        tariff: chosen ? { id: chosen.id, provider: chosen.provider, name: chosen.name, monthlyEur: Math.round(chosen.monthly * 100) / 100, bonusEur: chosen.bonusEur ? parseFloat(chosen.bonusEur) : null } : null,
      },
    }),
    [kind, state.plz, state.option, annualKwh, chosen, click.gclid],
  );

  const c = LANDING_COPY;
  const stepNames = [pick(c.steps.usage, locale), pick(c.steps.results, locale), pick(c.steps.request, locale)];
  const done = state.step === 4;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-8 pt-5 sm:px-8 sm:pt-8">
      <header className="flex items-center justify-between">
        <Logo className="!h-9" />
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="press flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-purple-900 transition-colors hover:border-purple-600 hover:text-purple-600">
          <WhatsappLogo size={22} weight="fill" />
        </a>
      </header>

      {!done && (
        <nav aria-label={c.stepOf(state.step, locale)} className="mt-8">
          <p className="text-xs font-semibold text-secondary" aria-live="polite">
            {c.stepOf(state.step, locale)}
          </p>
          <ol className="mt-2.5 grid grid-cols-3 gap-2">
            {stepNames.map((name, i) => {
              const filled = i + 1 <= state.step;
              return (
                <li key={name}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-purple-600 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ltr:origin-left rtl:origin-right motion-reduce:transition-none" style={{ transform: `scaleX(${filled ? 1 : 0})` }} />
                  </div>
                  <span className={`mt-2 block text-xs font-medium ${i + 1 === state.step ? "text-purple-900" : "text-secondary"}`}>{name}</span>
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <main className="flex flex-1 flex-col justify-center py-12 sm:py-16">
        <div ref={stepRef}>
          {state.step === 1 && (
            <StepUsage
              locale={locale}
              kind={kind}
              option={state.option}
              plz={state.plz}
              plzError={plzError}
              plzRef={plzRef}
              onOption={(v) => setState((s) => ({ ...s, option: v }))}
              onPlz={(v) => {
                setPlzError(false);
                setState((s) => ({ ...s, plz: toAsciiDigits(v).replace(/\D/g, "").slice(0, 5) }));
              }}
              onSubmit={submitUsage}
            />
          )}
          {state.step === 2 && <StepResults locale={locale} lookup={lookup} cards={cards} annualKwh={annualKwh} onChoose={choose} onChange={() => go({ step: 1 })} onRetry={() => setRetry((n) => n + 1)} />}
          {state.step === 3 && (
            <StepRequest
              locale={locale}
              kind={kind}
              chosen={chosen}
              extra={landingExtra}
              onChange={() => go({ step: lookup === "ready" ? 2 : 1 })}
              onSubmitted={() => {
                count("submitted");
                go({ step: 4 });
              }}
            />
          )}
          {state.step === 4 && <StepDone locale={locale} />}
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-border pt-6 text-center text-xs text-secondary">
        <p className="flex items-center gap-1.5 font-medium">
          <ShieldCheck size={15} weight="fill" className="text-purple-600" aria-hidden />
          {pick(c.ihk, locale)}
        </p>
        <p className="flex items-center gap-4">
          <a href={`/${locale}/imprint`} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">
            Impressum
          </a>
          <a href={`/${locale}/privacy-policy`} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">
            Datenschutz
          </a>
          <span className="font-latin">Tarefe · Düsseldorf</span>
        </p>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------ step 1

function StepUsage({
  locale,
  kind,
  option,
  plz,
  plzError,
  plzRef,
  onOption,
  onPlz,
  onSubmit,
}: {
  locale: Locale;
  kind: LandingKind;
  option: string;
  plz: string;
  plzError: boolean;
  plzRef: React.RefObject<HTMLInputElement | null>;
  onOption: (v: string) => void;
  onPlz: (v: string) => void;
  onSubmit: () => void;
}) {
  const c = LANDING_COPY;
  const group = USAGE_OPTIONS[kind];
  const usage = usageFor(kind, option);
  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <h1 data-heading tabIndex={-1} className="text-balance text-[1.9rem] font-extrabold leading-tight text-purple-900 outline-none sm:text-4xl">
          {pick(c.h1[kind], locale)}
        </h1>
        <p className="max-w-[44ch] text-base leading-relaxed text-secondary">{pick(c.sub, locale)}</p>
      </div>

      <form
        className="flex flex-col gap-9"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
      >
        <div className="flex flex-col gap-3">
          <label htmlFor="lp-usage" className="text-sm font-semibold text-purple-900">
            {pick(c.usageQuestion[kind], locale)}
          </label>
          <div className="relative">
            <select
              id="lp-usage"
              value={option}
              onChange={(e) => onOption(e.target.value)}
              className="h-16 w-full appearance-none rounded-2xl border border-border-strong bg-white ps-5 pe-14 text-lg font-semibold text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-4 focus:ring-purple-600/15"
            >
              {group.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {pick(o.label, locale)}
                </option>
              ))}
            </select>
            <CaretDown size={20} weight="bold" aria-hidden className="pointer-events-none absolute end-5 top-1/2 -translate-y-1/2 text-purple-600" />
          </div>
          <p className="text-xs text-secondary">{c.usageNote(fmtKwh(usage.kwh), locale)}</p>
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="lp-plz" className="text-sm font-semibold text-purple-900">
            {pick(c.plzLabel, locale)}
          </label>
          <input
            ref={plzRef}
            id="lp-plz"
            value={plz}
            onChange={(e) => onPlz(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={5}
            placeholder="40221"
            aria-invalid={plzError}
            aria-describedby={plzError ? "lp-plz-error" : undefined}
            dir="ltr"
            // 16px+ on purpose: iOS Safari zooms the page when a smaller field is focused.
            className={`font-latin h-16 w-full rounded-2xl border bg-white px-5 text-start text-lg font-semibold tracking-[0.12em] text-purple-900 outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-secondary/60 focus:ring-4 ${
              plzError ? "border-danger focus:border-danger focus:ring-danger/15" : "border-border-strong focus:border-purple-600 focus:ring-purple-600/15"
            }`}
          />
          {plzError && (
            <p id="lp-plz-error" role="alert" className="text-xs font-medium text-danger">
              {pick(c.plzError, locale)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <button type="submit" className="press inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-purple-600 px-8 text-base font-bold text-white transition-colors hover:bg-purple-900">
            {pick(c.showTariffs, locale)}
            <ArrowRight size={18} weight="bold" className="rtl:rotate-180" />
          </button>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-secondary">
            {c.chips.map((chip, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <CheckCircle size={17} weight="fill" className="text-success" aria-hidden />
                {pick(chip, locale)}
              </li>
            ))}
          </ul>
        </div>
      </form>
    </section>
  );
}

// ------------------------------------------------------------------ step 2

function Logo2({ provider }: { provider: string }) {
  const logo = PROVIDER_LOGOS[provider];
  return logo ? (
    <Image src={logo} alt={provider} className="h-9 w-auto max-w-[8.5rem] object-contain object-start" />
  ) : (
    <span className="text-sm font-bold text-purple-900">{provider}</span>
  );
}

function StepResults({
  locale,
  lookup,
  cards,
  annualKwh,
  onChoose,
  onChange,
  onRetry,
}: {
  locale: Locale;
  lookup: Lookup;
  cards: PricedTariff[];
  annualKwh: number;
  onChoose: (id: string | null) => void;
  onChange: () => void;
  onRetry: () => void;
}) {
  const c = LANDING_COPY;
  const priceRef = useRef<HTMLSpanElement>(null);
  const winner = cards[0];
  const others = cards.slice(1);
  const counted = useRef(false);

  // the winner's price counts up once, when the result first appears
  useEffect(() => {
    if (lookup !== "ready" || !winner || counted.current || !priceRef.current) return;
    counted.current = true;
    const el = priceRef.current;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const o = { v: 0 };
      gsap.to(o, { v: winner.monthly, duration: 0.9, ease: EASE, onUpdate: () => (el.textContent = fmtEur(o.v)), onComplete: () => (el.textContent = fmtEur(winner.monthly)) });
      gsap.from("[data-reveal]", { opacity: 0, y: 14, duration: 0.4, ease: EASE, stagger: 0.07, clearProps: "transform,opacity" });
    });
    return () => mm.revert();
  }, [lookup, winner]);

  return (
    <section className="flex flex-col gap-10">
      <h1 data-heading tabIndex={-1} className="text-balance text-[1.9rem] font-extrabold leading-tight text-purple-900 outline-none sm:text-4xl">
        {pick(c.resultsTitle, locale)}
      </h1>

      {lookup === "loading" && (
        <div className="flex flex-col gap-6" role="status">
          <p className="text-base font-medium text-secondary">{pick(c.searching, locale)}</p>
          <div className="h-64 animate-pulse rounded-3xl bg-tint" />
        </div>
      )}

      {lookup === "error" && (
        <div className="flex flex-col items-start gap-5">
          <p className="text-base text-secondary">{pick(c.lookupError, locale)}</p>
          <button type="button" onClick={onRetry} className="press inline-flex min-h-12 items-center rounded-full bg-purple-600 px-7 text-sm font-bold text-white hover:bg-purple-900">
            {pick(c.retry, locale)}
          </button>
        </div>
      )}

      {lookup === "empty" && (
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-tint p-8">
          <Headset size={32} weight="duotone" className="text-purple-600" aria-hidden />
          <p className="text-lg font-bold text-purple-900">{pick(c.noTariffsTitle, locale)}</p>
          <p className="text-base text-secondary">{pick(c.noTariffsBody, locale)}</p>
          <button type="button" onClick={() => onChoose(null)} className="press inline-flex min-h-14 items-center gap-2.5 rounded-full bg-purple-600 px-8 text-base font-bold text-white hover:bg-purple-900">
            {pick(c.submit, locale)}
            <ArrowRight size={18} weight="bold" className="rtl:rotate-180" />
          </button>
        </div>
      )}

      {lookup === "ready" && winner && (
        <div className="flex flex-col gap-6">
          <article data-reveal className="flex flex-col gap-7 rounded-3xl border-2 border-purple-600 bg-white p-7 shadow-[0_28px_60px_-34px_rgba(93,0,137,0.55)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <Logo2 provider={winner.provider} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-purple-900">{pick(c.cheapest, locale)}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-secondary">{winner.name}</p>
              <p className="font-latin mt-2 flex items-baseline gap-2 text-purple-900" dir="ltr">
                <span className="text-xl font-bold text-secondary">≈</span>
                <span ref={priceRef} className="text-6xl font-extrabold leading-none tracking-tight">
                  {fmtEur(winner.monthly)}
                </span>
                <span className="text-2xl font-bold">€</span>
              </p>
              <p className="mt-2 text-sm text-secondary">{pick(c.perMonth, locale)}</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {winner.bonusEur && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-3.5 py-1.5 text-sm font-semibold text-success">
                  <Gift size={16} weight="fill" aria-hidden />
                  {c.bonus(fmtEur(parseFloat(winner.bonusEur)), locale)}
                </li>
              )}
              <li className="inline-flex items-center gap-1.5 rounded-full bg-tint px-3.5 py-1.5 text-sm font-semibold text-purple-900">
                <ShieldCheck size={16} weight="fill" className="text-purple-600" aria-hidden />
                {winner.priceGuaranteeMonths ? c.guaranteeMonths(winner.priceGuaranteeMonths, locale) : pick(c.guarantee, locale)}
              </li>
            </ul>
            <button type="button" onClick={() => onChoose(winner.id)} className="press winner-cta-glow inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-purple-600 px-8 text-base font-bold text-white transition-colors hover:bg-purple-900">
              {pick(c.continueWith, locale)}
              <ArrowRight size={18} weight="bold" className="rtl:rotate-180" />
            </button>
          </article>

          {others.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {others.map((t) => (
                <article key={t.id} data-reveal className="flex flex-col justify-between gap-5 rounded-2xl border border-border-strong bg-white p-5">
                  <div>
                    <p className="text-sm font-semibold leading-snug text-purple-900">{t.name}</p>
                    <p className="font-latin mt-3 flex items-baseline gap-1.5 text-purple-900" dir="ltr">
                      <span className="text-sm font-bold text-secondary">≈</span>
                      <span className="text-3xl font-extrabold leading-none">{fmtEur(t.monthly)}</span>
                      <span className="text-lg font-bold">€</span>
                    </p>
                    <p className="mt-1 text-xs text-secondary">{pick(c.perMonthShort, locale)}</p>
                    {t.bonusEur && <p className="mt-3 text-xs font-semibold text-success">{c.bonus(fmtEur(parseFloat(t.bonusEur)), locale)}</p>}
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-purple-900">
                      <ShieldCheck size={14} weight="fill" className="mt-px shrink-0 text-purple-600" aria-hidden />
                      {t.priceGuaranteeMonths ? c.guaranteeMonths(t.priceGuaranteeMonths, locale) : pick(c.guarantee, locale)}
                    </p>
                  </div>
                  <button type="button" onClick={() => onChoose(t.id)} className="press inline-flex min-h-11 items-center justify-center rounded-full border border-purple-600 px-5 text-sm font-bold text-purple-600 transition-colors hover:bg-purple-600 hover:text-white">
                    {pick(c.choose, locale)}
                  </button>
                </article>
              ))}
            </div>
          )}

          <button type="button" onClick={() => onChoose(winner.id)} className="press mt-2 inline-flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-purple-600 px-8 text-base font-bold text-white transition-colors hover:bg-purple-900">
            {pick(c.continueBest, locale)}
            <ArrowRight size={18} weight="bold" className="rtl:rotate-180" />
          </button>

          <p className="text-sm text-secondary">
            {c.basedOn(fmtKwh(annualKwh), locale)}{" "}
            <button type="button" onClick={onChange} className="font-semibold text-purple-600 underline underline-offset-4 hover:text-purple-900">
              {pick(c.change, locale)}
            </button>
          </p>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ step 3

function StepRequest({
  locale,
  kind,
  chosen,
  extra,
  onChange,
  onSubmitted,
}: {
  locale: Locale;
  kind: LandingKind;
  chosen: PricedTariff | null;
  extra: Record<string, unknown>;
  onChange: () => void;
  onSubmitted: () => void;
}) {
  const c = LANDING_COPY;
  return (
    <section className="flex flex-col gap-10">
      <h1 data-heading tabIndex={-1} className="text-balance text-[1.9rem] font-extrabold leading-tight text-purple-900 outline-none sm:text-4xl">
        {pick(c.requestTitle, locale)}
      </h1>

      <ul className="flex flex-wrap gap-x-5 gap-y-2.5 text-sm font-semibold text-purple-900">
        {c.perks.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <CheckCircle size={17} weight="fill" className="shrink-0 text-success" aria-hidden />
            {pick(p, locale)}
          </li>
        ))}
      </ul>

      {chosen && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-tint px-4 py-2.5 text-sm">
          <p className="min-w-0 truncate">
            <span className="font-bold text-purple-900">{chosen.name}</span>
            <span className="font-latin ms-2 text-secondary" dir="ltr">
              ≈ {fmtEur(chosen.monthly)} €
            </span>
          </p>
          <button type="button" onClick={onChange} className="shrink-0 font-semibold text-purple-600 underline underline-offset-4 hover:text-purple-900">
            {pick(c.change, locale)}
          </button>
        </div>
      )}

      <ConsultationForm
        id="plp-lead-form"
        locale={locale}
        category="energy"
        serviceSlug={kind}
        bare
        className="gap-6! [&_input]:rounded-xl [&_input]:border-2 [&_input]:border-purple-600/40 [&_input]:px-4 [&_input]:py-3.5 [&_input]:shadow-[0_1px_0_rgba(93,0,137,0.06)] [&_input:focus]:border-purple-600"
        extra={extra}
        submitLabel={pick(c.submit, locale)}
        footnote={null}
        onSuccess={onSubmitted}
      />

      <p className="text-center text-sm leading-relaxed text-secondary">{pick(c.promise, locale)}</p>
    </section>
  );
}

// ------------------------------------------------------------------ step 4

function StepDone({ locale }: { locale: Locale }) {
  const c = LANDING_COPY;
  const checkRef = useRef<SVGPathElement>(null);
  useEffect(() => {
    const path = checkRef.current;
    if (!path) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(path, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: EASE, delay: 0.15, onComplete: () => gsap.set(path, { clearProps: "strokeDasharray,strokeDashoffset" }) });
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="flex flex-col items-center gap-10 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-success-bg text-success">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path ref={checkRef} d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
        </svg>
      </span>
      <div className="flex flex-col gap-3">
        <h1 data-heading tabIndex={-1} className="text-balance text-[1.9rem] font-extrabold leading-tight text-purple-900 outline-none sm:text-4xl">
          {pick(c.doneTitle, locale)}
        </h1>
        <p className="mx-auto max-w-[36ch] text-base leading-relaxed text-secondary">{pick(c.doneBody, locale)}</p>
      </div>
      <ol className="flex w-full flex-col gap-4 text-start">
        {c.next.map((line, i) => (
          <li key={i} className="flex items-center gap-4 rounded-2xl bg-tint px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white">{(i + 1).toLocaleString(locale === "fa" ? "fa-IR" : "de-DE")}</span>
            <span className="text-base font-semibold text-purple-900">{pick(line, locale)}</span>
          </li>
        ))}
      </ol>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-14 items-center gap-2.5 rounded-full border border-purple-600 px-8 text-base font-bold text-purple-600 transition-colors hover:bg-purple-600 hover:text-white">
        <WhatsappLogo size={20} weight="fill" />
        {pick(c.whatsapp, locale)}
        <Check size={0} className="hidden" />
      </a>
    </section>
  );
}
