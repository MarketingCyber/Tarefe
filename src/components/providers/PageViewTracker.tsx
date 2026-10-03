"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, EVENT } from "@/lib/analytics";
import type { Locale } from "@/lib/taxonomy";

/** Fires page_view on first load and every client-side route change —
 * mounted once in the locale root layout, so it covers the whole public
 * site without needing to be added to every page individually. */
export function PageViewTracker({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  useEffect(() => {
    track(EVENT.PAGE_VIEW, { path: pathname, locale });
  }, [pathname, locale]);

  return null;
}
