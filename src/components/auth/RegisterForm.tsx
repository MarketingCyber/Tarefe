"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type { Locale } from "@/lib/taxonomy";
import { track, EVENT } from "@/lib/analytics";

const LABELS: Record<
  Locale,
  {
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    confirmPassword: string;
    submit: string;
    sending: string;
    emailTaken: string;
    rateLimitError: string;
    mismatch: string;
    error: string;
  }
> = {
  fa: {
    name: "نام و نام خانوادگی",
    email: "ایمیل",
    password: "رمز عبور",
    passwordHint: "حداقل ۸ کاراکتر",
    confirmPassword: "تکرار رمز عبور",
    submit: "ساخت حساب",
    sending: "در حال ساخت حساب...",
    emailTaken: "این ایمیل قبلاً ثبت شده. وارد شو یا از ایمیل دیگری استفاده کن.",
    rateLimitError: "تعداد تلاش‌ها زیاد بوده. یک دقیقه صبر کن و دوباره امتحان کن.",
    mismatch: "رمز عبور و تکرار آن یکسان نیستند.",
    error: "مشکلی پیش آمد. لطفا دوباره تلاش کن.",
  },
  de: {
    name: "Vor- und Nachname",
    email: "E-Mail",
    password: "Passwort",
    passwordHint: "Mindestens 8 Zeichen",
    confirmPassword: "Passwort bestätigen",
    submit: "Konto erstellen",
    sending: "Konto wird erstellt...",
    emailTaken: "Diese E-Mail ist bereits registriert. Melde dich an oder nutze eine andere Adresse.",
    rateLimitError: "Zu viele Versuche. Bitte warte eine Minute und versuche es erneut.",
    mismatch: "Passwort und Bestätigung stimmen nicht überein.",
    error: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  },
  ru: {
    name: "Имя и фамилия",
    email: "Эл. почта",
    password: "Пароль",
    passwordHint: "Минимум 8 символов",
    confirmPassword: "Повтори пароль",
    submit: "Создать аккаунт",
    sending: "Создание аккаунта...",
    emailTaken: "Этот email уже зарегистрирован. Войди или используй другой адрес.",
    rateLimitError: "Слишком много попыток. Подожди минуту и попробуй снова.",
    mismatch: "Пароль и повтор не совпадают.",
    error: "Что-то пошло не так. Попробуй ещё раз.",
  },
};

/**
 * The immediate, unblocked signup path while Google sign-in stays wired
 * but disabled pending a real domain (see auth.ts's isGoogleAuthEnabled).
 * Same account shape as a Google-created one — a CUSTOMER row — so
 * nothing here conflicts with that path landing later.
 */
export function RegisterForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<"email_taken" | "rate_limited" | "mismatch" | "generic" | null>(null);
  const labels = LABELS[locale];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const unstick = setTimeout(() => setSubmitting(false), 10000);

    try {
      const form = new FormData(e.currentTarget);
      const name = form.get("name") as string;
      const email = form.get("email") as string;
      const password = form.get("password") as string;
      const confirmPassword = form.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        setError("mismatch");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, locale }),
      });

      if (res.status === 409) {
        setError("email_taken");
        setSubmitting(false);
        return;
      }
      if (res.status === 429) {
        setError("rate_limited");
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error("Registration failed");

      // Auto-login: the whole point is one action creates AND signs in the
      // account, same as the Google path — nobody should have to type the
      // password they just chose a second time.
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("Auto sign-in after registration failed");

      track(EVENT.SIGNUP, { locale });
      const callbackUrl = searchParams.get("callbackUrl") || "/app";
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("generic");
      setSubmitting(false);
    } finally {
      clearTimeout(unstick);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-border bg-white p-6">
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-xs font-semibold text-body">
          {labels.name}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
      </div>
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
          minLength={8}
          className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
        <p className="text-[11px] text-secondary">{labels.passwordHint}</p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="confirmPassword" className="text-xs font-semibold text-body">
          {labels.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
      </div>
      {error === "mismatch" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.mismatch}
        </p>
      )}
      {error === "email_taken" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.emailTaken}
        </p>
      )}
      {error === "rate_limited" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {labels.rateLimitError}
        </p>
      )}
      {error === "generic" && (
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
    </form>
  );
}
