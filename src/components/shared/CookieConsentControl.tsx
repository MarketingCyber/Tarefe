"use client";

import { openCookieSettings } from "@/lib/cookie-consent";

/**
 * Opens the cookie settings dialog (rendered by CookieConsentBanner in the root layout) from anywhere on the page:
 * a button on the cookie-policy page, a plain link-style button in the footer.
 */
export function CookieConsentControl({ label, variant = "button" }: { label: string; variant?: "button" | "link" }) {
  if (variant === "link") {
    return (
      <button type="button" onClick={openCookieSettings} className="text-sm text-secondary transition-colors hover:text-purple-600">
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="press rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-purple-900 transition-colors hover:border-purple-600"
    >
      {label}
    </button>
  );
}
