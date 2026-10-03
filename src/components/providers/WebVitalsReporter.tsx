"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Metric } from "web-vitals";
import { track, EVENT } from "@/lib/analytics";
import type { Locale } from "@/lib/taxonomy";

/**
 * Phase 12.3 (Performance) — Core Web Vitals were completely unmonitored
 * before this. Reuses the existing first-party event pipeline (Phase 10)
 * rather than a third-party RUM vendor, same reasoning as everything else
 * tracked in this app: self-hosted, no new vendor, no new consent surface
 * to reconcile.
 *
 * `import('web-vitals')` at effect-time, not a static top-level import —
 * this was NOT a style choice. A static `import {...} from "web-vitals"`
 * here silently broke every OTHER client component's effects on the page
 * (PageViewTracker's `track()` call included), even in files that never
 * rendered this component, as long as this file was reachable from the
 * import graph — confirmed by literally removing the static import line
 * and watching PageViewTracker's effect start firing again. Root cause
 * (some Turbopack chunk-ordering interaction with web-vitals' bundled
 * entry) wasn't fully pinned down; the dynamic import sidesteps it by
 * decoupling web-vitals' module evaluation into its own microtask, after
 * the initial render commit, independent of sibling components' modules.
 * It's also a genuine improvement on its own merits regardless — a
 * performance-monitoring tool has no business being in the same critical
 * initial bundle as everything it's trying to measure.
 *
 * Goes through track() unmodified — including its consent gate. Web
 * Vitals reporting is diagnostic data collection serving Tarefe's own
 * operational interest, not something the visitor asked for, so it needs
 * the same opt-in consent under TTDSG as page-view tracking already does;
 * there's no principled reason to carve out an exception here.
 */
export function WebVitalsReporter({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    import("web-vitals").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      if (cancelled) return;

      const report = (metric: Metric) => {
        track(EVENT.WEB_VITAL, {
          path: pathname,
          locale,
          metadata: { name: metric.name, value: metric.value, rating: metric.rating, id: metric.id },
        });
      };

      onCLS(report);
      onFCP(report);
      onINP(report);
      onLCP(report);
      onTTFB(report);
    });

    return () => {
      cancelled = true;
    };
    // Same reasoning as before on not re-running per pathname: web-vitals'
    // own callbacks fire once per page lifecycle (LCP/FCP/TTFB on first
    // paint; CLS/INP can report later, on visibility change) with no
    // unsubscribe API to tear down on route change. Known, accepted
    // imprecision: CLS/INP for a route reached via client-side navigation
    // (rare in this app) could get tagged with the pathname captured at
    // mount. Matches Next.js's own useReportWebVitals' same limitation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
