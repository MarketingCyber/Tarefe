"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Site-wide route transition — wraps only the routed content slot in each
 * of the three root layouts (public site, /app portal, /ops CRM). The
 * persistent chrome around it (Navbar/Footer, PortalNav, OpsNav) stays
 * outside this component and never moves — same "anchor the fixed
 * reference point" principle as any directional-nav transition, just
 * applied to a header/sidebar instead of a header bar.
 *
 * A short crossfade-and-settle, not a directional slide: this site's link
 * graph isn't a linear forward/back hierarchy (a PDP links to its PLP, its
 * category, related guides, the homepage — all "sideways"), so a
 * left/right slide would routinely imply a direction that isn't real.
 * `mode="wait"` lets the outgoing page fully clear before the next one
 * mounts, instead of overlapping them — pages here range from a two-field
 * contact page to an 11-section PDP, and showing both DOMs at once at
 * different heights would look like a layout bug, not a transition.
 * 220ms: this fires on every in-app navigation (a frequent action, unlike
 * a modal or drawer), so it stays at the fast end of the usual "modals/
 * transitions" range rather than the slow end.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
