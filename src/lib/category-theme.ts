import { Shield, Lightning, WifiHigh, PiggyBank } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

/**
 * The non-color half of each category's PLP/PDP identity — see
 * CategoryHeroFrame.tsx for the hero-image motif itself. Icons match the
 * homepage's own category cards (ServiceCategories.tsx: shield/bolt/wifi/
 * piggy-bank). Heading tracking is the one typographic variable that
 * stays within the site's single type system (no new font, no new scale)
 * while still reading as a deliberate per-category choice: energy's
 * `tracking-tight` reads compact/kinetic against retirement's default
 * `tracking-normal` calm.
 */
export const CATEGORY_ICON: Record<string, PhosphorIcon> = {
  insurance: Shield,
  energy: Lightning,
  communication: WifiHigh,
  retirement: PiggyBank,
};

export const CATEGORY_HEADING_TRACKING: Record<string, string> = {
  energy: "tracking-tight",
};

export function categoryHeadingTracking(categorySlug: string): string {
  return CATEGORY_HEADING_TRACKING[categorySlug] ?? "";
}
