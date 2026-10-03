/**
 * PLP/PDP hero photography — one real, manually verified photo per
 * subcategory (not per category, and not per leaf product: 15 subcategory
 * groups is the practical grain, since a leaf-product photo for all ~38
 * products would mostly be indistinguishable from its sibling's anyway).
 *
 * Same discipline as ServiceCategories.tsx/Hero.tsx's CATEGORY_IMAGE: every
 * URL below was opened and actually looked at before being used here, and
 * confirmed free-to-use under the Unsplash License (not an Unsplash+
 * premium photo, which needs a paid license this project doesn't have).
 * Sourced 2026-09-08 for this round's PDP/PLP redesign.
 *
 * Keyed identically to pdp-content.ts's PDP_CONTENT: `${category}/${subcategory}`.
 */
export const SUBCATEGORY_IMAGE: Record<string, string> = {
  // Insurance
  "insurance/home": "https://images.unsplash.com/photo-1515829231605-2d8e4455af56", // Berlin apartment high-rise
  "insurance/pets": "https://images.unsplash.com/photo-1765603950481-3a5879ec2ce7", // dog and cat in a living room
  "insurance/liability-legal": "https://images.unsplash.com/photo-1603796846097-bee99e4a601f", // signing a document
  "insurance/health": "https://images.unsplash.com/photo-1638202993928-7267aad84c31", // doctor holding a stethoscope
  "insurance/risk-provision": "https://images.unsplash.com/photo-1763890763432-17c9a529da20", // two people walking together
  "insurance/vehicles": "https://images.unsplash.com/photo-1658227608377-ae7fef4d2044", // driving, hand on wheel
  "insurance/travel": "https://images.unsplash.com/photo-1504150558240-0b4fd8946624", // traveler silhouette in an airport

  // Retirement
  "retirement/private-pension": "https://images.unsplash.com/photo-1542622475-904e18612fa1", // retired couple by a lake
  "retirement/riester": "https://images.unsplash.com/photo-1629360021730-3d258452c425", // family at the table with a child
  "retirement/ruerup": "https://images.unsplash.com/photo-1546514714-df0ccc50d7bf", // self-employed home-office desk
  "retirement/bav": "https://images.unsplash.com/photo-1568992687947-868a62a9f521", // team meeting at work

  // Energy
  "energy/electricity": "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e", // pylons at sunset
  "energy/gas": "https://images.unsplash.com/photo-1608100014049-ad0f788bb44f", // blue gas flame on a stove

  // Communication
  "communication/mobile": "https://images.unsplash.com/photo-1470350576089-539d5a852bf7", // phone in hand
  "communication/internet": "https://images.unsplash.com/photo-1606904825846-647eb07f5be2", // router, cable plugged in
};

export function getSubcategoryImage(categorySlug: string, subcategorySlug: string): string | undefined {
  return SUBCATEGORY_IMAGE[`${categorySlug}/${subcategorySlug}`];
}
