/**
 * One real, manually verified photo per guide — same discipline as
 * pdp-images.ts/ServiceCategories.tsx's CATEGORY_IMAGE: every URL below
 * was opened and actually looked at before being used here, and confirmed
 * free-to-use under the Unsplash License (not an Unsplash+ premium photo,
 * which needs a paid license this project doesn't have). Sourced
 * 2026-09-14. pkv-vs-gkv and personal-liability-insurance reuse the
 * matching PDP subcategory photo (insurance/health, insurance/liability-
 * legal — see pdp-images.ts) rather than sourcing a near-duplicate photo
 * of the same subject; the other two are guide-specific finds.
 *
 * A guide added later with no entry here just renders without a photo
 * (see getGuideImage's callers) — no image is more honest than a mismatched
 * or unverified one.
 */
export const GUIDE_IMAGE: Record<string, string> = {
  "pkv-vs-gkv": "https://images.unsplash.com/photo-1638202993928-7267aad84c31", // doctor holding a stethoscope
  "switching-electricity-provider": "https://images.unsplash.com/photo-1604177420682-0c840feb01de", // electric meter on a wall
  "dental-insurance-basics": "https://images.unsplash.com/photo-1681939282781-341ac4f61996", // dental checkup
  "personal-liability-insurance": "https://images.unsplash.com/photo-1603796846097-bee99e4a601f", // signing a document
};

export function getGuideImage(slug: string): string | undefined {
  return GUIDE_IMAGE[slug];
}
