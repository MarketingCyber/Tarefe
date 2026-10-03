"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/taxonomy";

const LABEL: Record<Locale, string> = {
  fa: "ادامه با گوگل",
  de: "Mit Google fortfahren",
  ru: "Продолжить с Google",
};

/**
 * The one button that IS the whole signup flow (2026-08-31) — Google
 * sign-in is auto-signup and auto-login in a single click, so there's no
 * separate "create account" form anywhere; a first-time click creates a
 * CUSTOMER-role account (see auth.ts's signIn callback), a returning
 * click just logs in. The G mark below is the real, published four-color
 * Google logo (an exception to "never hand-roll SVG icons" — this is a
 * required brand asset, not a decorative glyph an icon library would have
 * an equivalent for), kept on a plain white/bordered button matching
 * Google's own button guidelines rather than this app's purple accent —
 * a "Sign in with Google" button is expected to look the same everywhere.
 */
export function GoogleSignInButton({ locale, callbackUrl: fallbackCallbackUrl = "/app" }: { locale: Locale; callbackUrl?: string }) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || fallbackCallbackUrl;

  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="press flex w-full items-center justify-center gap-2.5 rounded-full border border-border-strong bg-white px-6 py-3 text-sm font-semibold text-purple-900 transition-colors hover:border-purple-600"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.6C40.4 36.7 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
      </svg>
      {LABEL[locale]}
    </button>
  );
}
