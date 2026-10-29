"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/cookie-consent";
import type { Locale } from "@/lib/taxonomy";

// The stored banner state only changes through this component, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

/**
 * Cookie notice (owner's decision, 2026-10-29: no consent check in any tag or tool, so there is nothing to choose —
 * the banner only informs and "OK" dismisses it). Renders nothing until mount confirms it hasn't been dismissed yet,
 * which avoids a hydration flash for returning visitors.
 */
export function CookieConsentBanner({ locale, label }: { locale: Locale; label: { body: string; acceptAll: string; policyLink: string } }) {
  // Server render and first client render both say "dismissed", so nothing flashes for returning visitors.
  const seenBefore = useSyncExternalStore(subscribeNever, () => getConsent() !== null, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (seenBefore || dismissed) return null;

  function dismiss() {
    setConsent("accepted");
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label={label.policyLink}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <div className="container-page flex flex-col items-center gap-3 py-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-body">
          {label.body}{" "}
          <Link href={`/${locale}/cookie-policy`} className="font-semibold text-purple-600 underline underline-offset-2 hover:text-purple-900">
            {label.policyLink}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="press shrink-0 rounded-full bg-purple-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-900"
        >
          {label.acceptAll}
        </button>
      </div>
    </div>
  );
}
