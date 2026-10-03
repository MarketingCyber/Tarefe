"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle, WarningCircle, Info, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import { QUALIFICATION_REGISTRY } from "@/lib/qualification-registry";
import { track, EVENT } from "@/lib/analytics";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";

const LABELS: Record<Locale, { back: string; next: string; seeResult: string; startOver: string; consultationCta: string; stepOf: (a: number, b: number) => string }> = {
  fa: { back: "قبلی", next: "بعدی", seeResult: "مشاهده نتیجه", startOver: "شروع دوباره", consultationCta: "درخواست مشاوره رایگان", stepOf: (a, b) => `مرحله ${a} از ${b}` },
  de: { back: "Zurück", next: "Weiter", seeResult: "Ergebnis ansehen", startOver: "Neu starten", consultationCta: "Kostenlose Beratung anfragen", stepOf: (a, b) => `Schritt ${a} von ${b}` },
  ru: { back: "Назад", next: "Далее", seeResult: "Показать результат", startOver: "Начать заново", consultationCta: "Запросить бесплатную консультацию", stepOf: (a, b) => `Шаг ${a} из ${b}` },
};

const RESULT_STYLE = {
  eligible: { icon: CheckCircle, bg: "bg-success-bg", text: "text-success" },
  conditional: { icon: Info, bg: "bg-tint", text: "text-purple-600" },
  "not-eligible": { icon: WarningCircle, bg: "bg-warning-bg", text: "text-warning" },
} as const;

/**
 * Takes a `qualificationId` (a plain string key into QUALIFICATION_REGISTRY)
 * rather than the config object itself — configs contain functions
 * (showIf/match), and functions can't be passed as props from a Server
 * Component to a Client Component. Looking the config up here, inside the
 * client bundle, sidesteps that serialization boundary entirely.
 */
export function QualificationWizard({ locale, qualificationId, consultationHref }: { locale: Locale; qualificationId: string; consultationHref: string }) {
  const config = QUALIFICATION_REGISTRY[qualificationId];
  const storageKey = `tarefe:qualification:${qualificationId}`;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();
  const startedRef = useRef(false);

  function trackStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    track(EVENT.QUALIFICATION_STARTED, { locale, service: qualificationId });
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately starts empty on the server/first client render (avoids an SSR hydration mismatch) and only syncs from localStorage, an external system, once mounted
      if (raw) setAnswers(JSON.parse(raw));
    } catch {
      // no saved progress — start fresh
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // progress just won't resume next visit — the wizard still works
    }
  }, [answers, storageKey]);

  const visibleQuestions = useMemo(() => config?.questions.filter((q) => !q.showIf || q.showIf(answers)) ?? [], [config, answers]);
  const current = visibleQuestions[stepIndex];
  const isLast = stepIndex === visibleQuestions.length - 1;
  const canProceed = !current?.required || Boolean(answers[current.id]);

  const outcome = useMemo(() => config?.outcomes.find((o) => o.match(answers)), [config, answers]);

  function next() {
    if (isLast) {
      setDone(true);
      track(EVENT.QUALIFICATION_COMPLETED, { locale, service: qualificationId, metadata: { result: outcome?.result } });
    } else {
      setStepIndex((i) => Math.min(i + 1, visibleQuestions.length - 1));
    }
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function restart() {
    setAnswers({});
    setStepIndex(0);
    setDone(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // nothing to clean up
    }
  }

  if (!config) return null;

  if (done && outcome) {
    const style = RESULT_STYLE[outcome.result];
    const Icon = style.icon;
    return (
      <div className="rounded-2xl border border-border bg-white p-6">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${style.bg} ${style.text}`}>
          <Icon size={24} weight="fill" />
        </span>
        <p className="mt-4 text-sm leading-relaxed text-body">{outcome.message[locale]}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {/* outcome.ctaHref is a locale-agnostic path (e.g. "/services/.../fiber")
              stored in the config — the config has no locale in scope, so it's
              prefixed here, same as consultationHref is pre-formed by the caller. */}
          <ConsultationCtaLink
            href={outcome.ctaHref ? `/${locale}${outcome.ctaHref}` : consultationHref}
            className="press inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900"
          >
            {outcome.ctaLabel?.[locale] ?? LABELS[locale].consultationCta}
            <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
          </ConsultationCtaLink>
          {outcome.ctaHref && (
            <ConsultationCtaLink href={consultationHref} className="press inline-flex items-center text-sm font-medium text-secondary hover:text-purple-600">
              {LABELS[locale].consultationCta}
            </ConsultationCtaLink>
          )}
          <button type="button" onClick={restart} className="text-sm font-medium text-secondary hover:text-purple-600">
            {LABELS[locale].startOver}
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="mb-5">
        <p className="text-xs font-medium text-secondary">{LABELS[locale].stepOf(stepIndex + 1, visibleQuestions.length)}</p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-tint">
          <motion.div
            className="h-full rounded-full bg-purple-600"
            animate={{ width: `${((stepIndex + 1) / visibleQuestions.length) * 100}%` }}
            transition={{ duration: reduce ? 0 : 0.25, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </div>

      {/*
       * Deliberately no AnimatePresence/exit transition here: with
       * mode="wait" the step only advances once the exit animation
       * *completes*, and that completion can silently never fire (backgrounded
       * tab throttling requestAnimationFrame, etc.) — leaving the wizard
       * stuck showing the previous question while internal state has
       * already moved on. Correctness of "does the next question actually
       * appear" matters more than an exit fade here, so this only animates
       * the *entry* of each new question (key-based remount), never blocks on exit.
       */}
      <motion.div
        key={current.id}
        initial={reduce ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      >
        <p id={`${current.id}-label`} className="text-sm font-semibold text-purple-900">
          {current.question[locale]}
        </p>
        {current.helpText && <p className="mt-1.5 text-xs text-secondary">{current.helpText[locale]}</p>}

        {(current.type === "radio" || current.type === "select") && current.options && (
          // WAI-ARIA requires role="radio" elements to sit inside a
          // role="radiogroup" ancestor — without it, automated a11y checks
          // (axe, Lighthouse) flag "required parent role not present" and
          // some screen readers won't announce these as a single group.
          <div role="radiogroup" aria-labelledby={`${current.id}-label`} className="mt-4 grid gap-2.5">
            {current.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={answers[current.id] === opt.value}
                onClick={() => {
                  trackStart();
                  setAnswers((a) => ({ ...a, [current.id]: opt.value }));
                }}
                className={`press rounded-xl border px-4 py-3 text-start text-sm font-medium transition-colors ${
                  answers[current.id] === opt.value ? "border-purple-600 bg-purple-600/5 text-purple-900" : "border-border-strong text-body hover:border-purple-600"
                }`}
              >
                {opt.label[locale]}
              </button>
            ))}
          </div>
        )}

        {(current.type === "text" || current.type === "number") && (
          <input
            type={current.type}
            value={answers[current.id] ?? ""}
            onChange={(e) => {
              trackStart();
              setAnswers((a) => ({ ...a, [current.id]: e.target.value }));
            }}
            className="mt-4 w-full rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
        )}
      </motion.div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={back} disabled={stepIndex === 0} className="press inline-flex items-center gap-1.5 text-sm font-medium text-secondary disabled:opacity-0">
          <ArrowLeft size={14} weight="bold" className="rtl:rotate-180" />
          {LABELS[locale].back}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canProceed}
          className="press inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLast ? LABELS[locale].seeResult : LABELS[locale].next}
          <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
