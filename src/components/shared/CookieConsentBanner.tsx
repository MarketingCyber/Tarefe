"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/cookie-consent";
import type { Locale } from "@/lib/taxonomy";

/**
 * Opt-in consent banner, gating src/lib/analytics.ts's track() calls (see
 * that file's comment). Renders nothing until mount confirms there's truly
 * no stored choice yet — avoids a hydration flash where server-rendered
 * markup assumes "no consent" but the visitor already chose on a previous
 * visit.
 */
export function CookieConsentBanner({ locale, label }: { locale: Locale; label: { body: string; acceptAll: string; necessaryOnly: string; policyLink: string } }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  function choose(value: "accepted" | "necessary") {
    setConsent(value);
    setVisible(false);
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("necessary")}
            className="press rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-purple-900 transition-colors hover:border-purple-600"
          >
            {label.necessaryOnly}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="press rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-900"
          >
            {label.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
