"use client";

import { useState } from "react";
import { CONSENT_KEY } from "@/lib/cookie-consent";

/**
 * Standalone "change your choice" control for the cookie-policy page only
 * — deliberately not folded into CookieConsentBanner, since resetting the
 * stored choice and reloading is the simplest reliable way to bring the
 * banner (and its full accept/necessary-only UI) back on demand.
 */
export function CookieConsentControl({ label }: { label: string }) {
  const [done, setDone] = useState(false);

  function reset() {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
    } catch {
      // storage unavailable — nothing to reset
    }
    setDone(true);
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={done}
      className="press rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-purple-900 transition-colors hover:border-purple-600 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
