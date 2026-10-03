"use client";

import { usePathname } from "next/navigation";
import { track, EVENT } from "@/lib/analytics";

/**
 * `phone_clicked` was defined in the EVENT catalog but never actually
 * fired anywhere — every `tel:` link on the site was a plain `<a>` (found
 * 2026-08-31 while auditing which key events are real vs. aspirational).
 * A small client leaf, not a whole-page "use client" conversion, so the
 * three server-rendered pages/components that use this stay server
 * components otherwise.
 */
export function TrackedPhoneLink({
  locale,
  className,
  children,
}: {
  locale: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <a href="tel:+4921154218000" onClick={() => track(EVENT.PHONE_CLICKED, { path: pathname, locale })} className={className}>
      {children}
    </a>
  );
}
