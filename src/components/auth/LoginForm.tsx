"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/taxonomy";
import { track, EVENT } from "@/lib/analytics";
import { GoogleSignInButton } from "./GoogleSignInButton";

const LABELS: Record<
  Locale,
  {
    email: string;
    password: string;
    submit: string;
    sending: string;
    error: string;
    googleOnlyError: string;
    googleDeniedError: string;
    deactivatedError: string;
    rateLimitError: string;
    totpTitle: string;
    totpHint: string;
    totp: string;
    totpError: string;
    verify: string;
    back: string;
    divider: string;
  }
> = {
  fa: {
    email: "ایمیل",
    password: "رمز عبور",
    submit: "ورود",
    sending: "در حال ورود...",
    error: "ایمیل یا رمز عبور اشتباه است.",
    googleOnlyError: "این حساب با گوگل ساخته شده و رمز عبور ندارد. از دکمه «ادامه با گوگل» استفاده کن.",
    googleDeniedError: "ورود با گوگل برای حساب‌های کارکنان فعال نیست. با ایمیل و رمز عبور وارد شو.",
    deactivatedError: "دسترسی این حساب غیرفعال شده. با ادمین تماس بگیر.",
    rateLimitError: "تعداد تلاش‌ها زیاد بوده. یک دقیقه صبر کن و دوباره امتحان کن.",
    totpTitle: "تأیید دو مرحله‌ای",
    totpHint: "کد ۶ رقمی اپلیکیشن Authenticator خود را وارد کن.",
    totp: "کد تأیید",
    totpError: "کد وارد شده درست نیست.",
    verify: "تأیید",
    back: "بازگشت",
    divider: "یا",
  },
  de: {
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    sending: "Anmeldung...",
    error: "E-Mail oder Passwort ist falsch.",
    googleOnlyError: "Dieses Konto wurde mit Google erstellt und hat kein Passwort. Nutze „Mit Google fortfahren“.",
    googleDeniedError: "Die Google-Anmeldung ist für Mitarbeiterkonten nicht verfügbar. Bitte mit E-Mail und Passwort anmelden.",
    deactivatedError: "Der Zugang zu diesem Konto wurde deaktiviert. Bitte wende dich an einen Admin.",
    rateLimitError: "Zu viele Versuche. Bitte warte eine Minute und versuche es erneut.",
    totpTitle: "Zwei-Faktor-Verifizierung",
    totpHint: "Gib den 6-stelligen Code aus deiner Authenticator-App ein.",
    totp: "Bestätigungscode",
    totpError: "Der eingegebene Code ist falsch.",
    verify: "Bestätigen",
    back: "Zurück",
    divider: "oder",
  },
  ru: {
    email: "Эл. почта",
    password: "Пароль",
    submit: "Войти",
    sending: "Вход...",
    error: "Неверный email или пароль.",
    googleOnlyError: "Этот аккаунт создан через Google и не имеет пароля. Используй кнопку «Продолжить с Google».",
    googleDeniedError: "Вход через Google недоступен для аккаунтов сотрудников. Войди по email и паролю.",
    deactivatedError: "Доступ к этому аккаунту отключён. Свяжись с администратором.",
    rateLimitError: "Слишком много попыток. Подожди минуту и попробуй снова.",
    totpTitle: "Двухфакторная проверка",
    totpHint: "Введите 6-значный код из приложения Authenticator.",
    totp: "Код подтверждения",
    totpError: "Введённый код неверен.",
    verify: "Подтвердить",
    back: "Назад",
    divider: "или",
  },
};

export function LoginForm({ locale, googleEnabled = false }: { locale: Locale; googleEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);
  const [deactivated, setDeactivated] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  // The Google button does a full-page redirect through Google and back
  // (unlike the credentials form's redirect:false JS call below), so a
  // signIn-callback rejection (staff email — see auth.ts) can only reach
  // this component as a `?error=` query param on load, not a JS return
  // value. Read once on mount; a fresh submit clears it like the others.
  const [googleDenied, setGoogleDenied] = useState(() => searchParams.get("error") === "AccessDenied");
  // MFA step: once the server tells us a TOTP code is required, we hold on
  // to the already-verified email/password so the second submit doesn't
  // force the user to retype them — only the 6-digit code is new input.
  const [mfaPending, setMfaPending] = useState<{ email: string; password: string } | null>(null);
  const [totpError, setTotpError] = useState(false);
  const labels = LABELS[locale];

  async function attemptSignIn(email: string, password: string, totpCode?: string) {
    // signIn() serializes its options through URLSearchParams, which turns
    // an `undefined` value into the literal string "undefined" rather than
    // omitting the key — a truthy string server-side. Only include the
    // field at all when there's a real code to send, so authorize()'s
    // `!totpCode` check actually sees "not provided" for a first-step
    // password-only submit instead of a corrupted-looking value.
    const result = await signIn("credentials", { email, password, ...(totpCode ? { totpCode } : {}), redirect: false });

    if (result?.code === "mfa_required") {
      setMfaPending({ email, password });
      setSubmitting(false);
      return;
    }
    if (result?.code === "mfa_invalid") {
      setTotpError(true);
      setSubmitting(false);
      return;
    }
    if (result?.code === "rate_limited") {
      setRateLimited(true);
      setSubmitting(false);
      return;
    }
    if (result?.code === "google_only") {
      setGoogleOnly(true);
      setSubmitting(false);
      return;
    }
    if (result?.code === "deactivated") {
      setDeactivated(true);
      setSubmitting(false);
      return;
    }
    if (result?.error) {
      setError(true);
      setSubmitting(false);
      return;
    }

    track(EVENT.LOGIN, { locale });
    const callbackUrl = searchParams.get("callbackUrl") || "/app";
    router.push(callbackUrl);
    router.refresh();
    // No setSubmitting(false) here: this component is about to unmount as
    // the route changes, and clearing it first would just flash the button
    // back to its idle label for an instant.
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    setGoogleOnly(false);
    setGoogleDenied(false);
    setDeactivated(false);
    setRateLimited(false);

    // Absolute fallback: whatever happens with sign-in or the destination
    // page, never leave the button stuck forever. A Server Component
    // throwing after router.push() navigates there isn't something this
    // component's own try/catch can observe — every page-level auth() call
    // in /app and /ops guards against that race separately. This timer is
    // what actually guarantees recovery regardless of the failure mode.
    const unstick = setTimeout(() => setSubmitting(false), 8000);

    try {
      const form = new FormData(e.currentTarget);
      const email = form.get("email") as string;
      const password = form.get("password") as string;
      await attemptSignIn(email, password);
    } catch {
      setError(true);
      setSubmitting(false);
    } finally {
      clearTimeout(unstick);
    }
  }

  async function handleTotpSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mfaPending) return;
    setSubmitting(true);
    setTotpError(false);
    setRateLimited(false);
    const unstick = setTimeout(() => setSubmitting(false), 8000);
    try {
      const form = new FormData(e.currentTarget);
      const totpCode = form.get("totpCode") as string;
      await attemptSignIn(mfaPending.email, mfaPending.password, totpCode);
    } catch {
      setTotpError(true);
      setSubmitting(false);
    } finally {
      clearTimeout(unstick);
    }
  }

  if (mfaPending) {
    return (
      <form onSubmit={handleTotpSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-6">
        <div>
          <h2 className="text-sm font-bold text-purple-900">{labels.totpTitle}</h2>
          <p className="mt-1 text-xs text-secondary">{labels.totpHint}</p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="totpCode" className="text-xs font-semibold text-body">
            {labels.totp}
          </label>
          <input
            id="totpCode"
            name="totpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            className="font-latin rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-center text-lg tracking-[0.4em] text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
        </div>
        {totpError && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {labels.totpError}
          </p>
        )}
        {rateLimited && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {labels.rateLimitError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="press inline-flex flex-1 items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900 disabled:opacity-60"
          >
            {submitting ? labels.sending : labels.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setMfaPending(null);
              setTotpError(false);
            }}
            className="press rounded-full border border-border-strong px-4 py-3 text-sm font-semibold text-purple-900 hover:border-purple-600"
          >
            {labels.back}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-4">
      {googleEnabled && (
        <>
          <GoogleSignInButton locale={locale} />
          <div className="flex items-center gap-3 text-xs text-secondary">
            <span className="h-px flex-1 bg-border" />
            {labels.divider}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-6">
      <div className="grid gap-1.5">
        <label htmlFor="email" className="text-xs font-semibold text-body">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold text-body">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.error}
        </p>
      )}
      {googleOnly && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.googleOnlyError}
        </p>
      )}
      {googleDenied && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.googleDeniedError}
        </p>
      )}
      {deactivated && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.deactivatedError}
        </p>
      )}
      {rateLimited && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.rateLimitError}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="press mt-1 inline-flex items-center justify-center rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900 disabled:opacity-60"
      >
        {submitting ? labels.sending : labels.submit}
      </button>
      </form>
    </div>
  );
}
