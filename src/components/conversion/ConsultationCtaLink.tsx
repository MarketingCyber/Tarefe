"use client";

import Link from "next/link";
import { scrollToFormField } from "@/lib/scroll-to-form";

/**
 * Drop-in replacement for a CTA `<a>`/`<Link>` that may point either at a
 * lead form embedded further down the *same* page (`href="#pdp-lead-form"`)
 * or at a real route on another page (`href="/fa/consultation"`). For the
 * former, clicking centers the form's first field in the viewport instead
 * of relying on the browser's native anchor-jump (see scroll-to-form.ts for
 * why); for the latter it's a plain Next `<Link>`, unchanged. Kept as a
 * real `<a href="#...">` for the hash case (not a `<button>`) so it stays a
 * real link — middle-click/open-in-new-tab and "copy link" keep working,
 * and a form-not-found or pre-hydration click still falls back to the
 * browser's own anchor jump.
 */
export function ConsultationCtaLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  /** Side effect only (e.g. an analytics event) — runs first and can never block the navigation/scroll. */
  onClick?: () => void;
}) {
  if (!href.startsWith("#")) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const formId = href.slice(1);
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        onClick?.();
        if (!document.getElementById(formId)) return;
        e.preventDefault();
        history.pushState(null, "", href);
        scrollToFormField(formId);
      }}
    >
      {children}
    </a>
  );
}
