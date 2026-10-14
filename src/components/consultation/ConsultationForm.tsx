"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Locale } from "@/lib/taxonomy";
import { track, EVENT, getAttribution } from "@/lib/analytics";
import { getConsent } from "@/lib/cookie-consent";
import { germanPhoneError } from "@/lib/phone";

/**
 * Reuses the real GA4 identity cookie if the client script already ran and
 * set one (so this event stitches into the same session Google would
 * otherwise see) — falls back to a fresh one-off id in the same
 * `random.timestamp` shape GA4 itself uses, for exactly the case this
 * feature exists to catch: consent was accepted but the visitor converted
 * before the 3s-delayed client script had a chance to load and set `_ga`
 * (see GtmScript.tsx). Never generated when consent hasn't been accepted —
 * see the consentAccepted check at the call site below.
 */
function getOrCreateGaClientId(): string {
  const match = document.cookie.match(/(?:^|; )_ga=([^;]+)/);
  if (match) {
    const m = /^GA\d\.\d\.(\d+\.\d+)$/.exec(decodeURIComponent(match[1]));
    if (m) return m[1];
  }
  return `${Math.floor(Math.random() * 2147483647)}.${Math.floor(Date.now() / 1000)}`;
}

const MIN_TOKEN_AGE_MS = 2_200;

const LABELS: Record<
  Locale,
  {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneNote: string;
    submit: string;
    sending: string;
    error: string;
    riskReversal: string;
  }
> = {
  fa: {
    firstName: "نام",
    lastName: "نام خانوادگی",
    email: "ایمیل (اختیاری)",
    phone: "شماره تماس",
    phoneNote: "ترجیحاً شماره‌ای وارد کن که واتساپ هم روش فعال باشه — معمولاً از همون طریق باهات در تماسیم.",
    submit: "ارسال درخواست",
    sending: "در حال ارسال...",
    error: "مشکلی پیش آمد. لطفا دوباره تلاش کنید یا از طریق واتساپ با ما در ارتباط باشید.",
    riskReversal: "۱۰۰٪ رایگان و بدون تعهد — فقط یک بار تماس می‌گیریم.",
  },
  de: {
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail (optional)",
    phone: "Telefonnummer",
    phoneNote: "Am besten eine Nummer mit aktivem WhatsApp — wir melden uns in der Regel darüber.",
    submit: "Anfrage senden",
    sending: "Wird gesendet...",
    error: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder kontaktieren Sie uns per WhatsApp.",
    riskReversal: "100 % kostenlos und unverbindlich — wir melden uns nur einmal.",
  },
  ru: {
    firstName: "Имя",
    lastName: "Фамилия",
    email: "Эл. почта (необязательно)",
    phone: "Номер телефона",
    phoneNote: "Лучше указать номер с активным WhatsApp — мы обычно связываемся именно через него.",
    submit: "Отправить запрос",
    sending: "Отправка...",
    error: "Что-то пошло не так. Попробуйте ещё раз или свяжитесь с нами в WhatsApp.",
    riskReversal: "100% бесплатно и ни к чему не обязывает — мы свяжемся всего один раз.",
  },
};

export function ConsultationForm({
  locale,
  serviceLabel,
  category,
  serviceSlug,
  id,
  heading,
  className,
}: {
  locale: Locale;
  serviceLabel?: string;
  /** Taxonomy category slug (e.g. "insurance") — for real lead attribution, distinct from the display label. */
  category?: string;
  serviceSlug?: string;
  /** Anchor id — lets a page scroll straight to this exact form (e.g. StickyConsultationCta on a PDP with the form embedded inline). */
  id?: string;
  /** Optional headline shown above the fields, for contexts where the form is embedded directly on a page rather than being the page's whole reason for existing. */
  heading?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const labels = LABELS[locale];
  const startedRef = useRef(false);

  // Anti-abuse token (see lib/lead-guard.ts): fetched when the form mounts,
  // sent with the submission. A bot POSTing straight at /api/leads never
  // loads this page, so it never has one. The submit handler also waits
  // until the token is at least MIN_TOKEN_AGE_MS old — a person needs far
  // longer to fill three fields, but password-manager autofill + an instant
  // click could otherwise beat the server's minimum-age check.
  const tokenRef = useRef<{ promise: Promise<string | null>; at: number } | null>(null);
  function loadToken() {
    const promise = fetch("/api/leads/token", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && typeof j.token === "string" ? (j.token as string) : null))
      .catch(() => null);
    tokenRef.current = { promise, at: Date.now() };
    return tokenRef.current;
  }
  useEffect(() => {
    loadToken();
  }, []);

  function handleFirstInteraction() {
    if (startedRef.current) return;
    startedRef.current = true;
    track(EVENT.CONSULTATION_FORM_STARTED, { path: pathname, locale, category, service: serviceSlug });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);

    const form = new FormData(e.currentTarget);
    const { first, last } = getAttribution();
    const consentAccepted = getConsent() === "accepted";
    try {
      const send = (formToken: string | null) =>
        fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formToken: formToken ?? undefined,
          website: form.get("website"),
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          category,
          serviceSlug,
          sourcePage: pathname,
          locale,
          utmFirstSource: first?.source,
          utmFirstMedium: first?.medium,
          utmFirstCampaign: first?.campaign,
          utmFirstTerm: first?.term,
          utmFirstContent: first?.content,
          utmLastSource: last?.source,
          utmLastMedium: last?.medium,
          utmLastCampaign: last?.campaign,
          utmLastTerm: last?.term,
          utmLastContent: last?.content,
          consentAccepted,
          gaClientId: consentAccepted ? getOrCreateGaClientId() : undefined,
        }),
      });

      const waitForToken = async (t: { promise: Promise<string | null>; at: number }) => {
        const token = await t.promise;
        const wait = MIN_TOKEN_AGE_MS - (Date.now() - t.at);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        return token;
      };
      let res = await send(await waitForToken(tokenRef.current ?? loadToken()));
      if (res.status === 400) {
        // A tab left open for hours (or a stale cached page) carries an expired token — get a fresh one and try once more.
        const body = await res.clone().json().catch(() => null);
        if (body?.code === "form_token") res = await send(await waitForToken(loadToken()));
      }
      if (!res.ok) throw new Error("Request failed");
      track(EVENT.CONSULTATION_SUBMITTED, { path: pathname, locale, category, service: serviceSlug });
      router.push(`/${locale}/consultation/success`);
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      onFocus={handleFirstInteraction}
      className={`relative grid gap-4 rounded-2xl border border-border bg-white p-6 ${className ?? ""}`}
    >
      {heading && <p className="text-base font-bold text-purple-900">{heading}</p>}
      {serviceLabel && (
        <p className="rounded-lg bg-tint px-3 py-2 text-xs font-medium text-purple-600">{serviceLabel}</p>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field id="firstName" label={labels.firstName} type="text" required />
        <Field id="lastName" label={labels.lastName} type="text" required />
      </div>
      <Field
        id="phone"
        label={labels.phone}
        type="tel"
        required
        // A pattern, not a real-looking number: bots can read placeholders, and a copied
        // "0171 1234567" would pass validation. "01xx xxxxxxx" shows people the shape
        // but fails the check if a bot pastes it verbatim.
        placeholder="01xx xxxxxxx"
        validate={(v) => germanPhoneError(v, locale)}
      />
      <p className="-mt-2.5 text-[11px] text-secondary">{labels.phoneNote}</p>
      <Field id="email" label={labels.email} type="email" />
      {/* Honeypot: invisible to people (clipped to 1px, not focusable, ignored by
          screen readers and autofill), irresistible to form-filling bots.
          A non-empty value makes the server silently drop the submission. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="press mt-1 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900 disabled:opacity-60"
      >
        {submitting ? labels.sending : labels.submit}
      </button>
      {/* Risk reversal right at the point of commitment — the moment
          someone is deciding whether to submit is exactly when "is this
          going to cost me something / get me spammed" is loudest. Both
          claims are real and already used sitewide (see dict.home.heroTrust). */}
      <p className="text-center text-[11px] text-secondary">{labels.riskReversal}</p>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  required,
  placeholder,
  validate,
}: {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  /** Returns an error message for an invalid value, "" when valid — shown through the browser's own validation bubble on submit. */
  validate?: (value: string) => string;
}) {
  return (
    // min-w-0 here and w-full min-w-0 on the input: a text input has an
    // intrinsic width (~218px at 16px font), and a grid item won't shrink
    // below its content by default — two of these side by side in the
    // first/last name row overflowed a phone screen and widened the page.
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-body">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        // Native constraint validation: an empty custom message means valid, so the
        // browser blocks the submit and shows this text next to the field when not.
        onInput={validate ? (e) => e.currentTarget.setCustomValidity(e.currentTarget.value ? validate(e.currentTarget.value) : "") : undefined}
        // text-base, not text-sm — iOS Safari force-zooms the page on
        // focus for any input under 16px (see EnergyConsumptionCalculator.tsx's
        // PLZ field for the full "why", found on this same form's page).
        className="w-full min-w-0 rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-base text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25 sm:text-sm"
      />
    </div>
  );
}
