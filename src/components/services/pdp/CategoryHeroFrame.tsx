import Image from "next/image";
import { ShieldCheck, Lightning } from "@phosphor-icons/react/dist/ssr";

/**
 * Four category identities, one per PLP/PDP hero — built after the
 * homepage's own category cards already established shield=insurance,
 * piggy-bank=retirement, bolt=energy, wifi=communication (ServiceCategories.tsx).
 * Deliberately NOT four new accent colors — docs/design-system.md's 60/30/10
 * rule stays intact; every frame below only ever uses purple, gold, white,
 * and the border/tint neutrals already in the palette. The identity comes
 * from shape and motif instead: insurance reads as "protected" (a soft
 * halo + a shield badge, like something wrapped/guarded), retirement reads
 * as "headed somewhere steady" (a slow upward arc — deliberately abstract,
 * never a literal chart implying a specific return), energy reads as
 * "kinetic" (a bolt chip badge on the same rounded frame — an earlier
 * angular clip-path corner was dropped: clip-path clips the box's own
 * border/shadow too, so the diagonal edge rendered as a raw, unbordered
 * slice that read as a broken corner rather than a deliberate shape),
 * communication reads as "connected" (a dot-grid,
 * network-node texture). Each is a real, if quiet, "one memorable thing"
 * per category rather than the same rounded photo frame reused four times.
 */
export function CategoryHeroFrame({ categorySlug, image }: { categorySlug: string; image: string }) {
  if (categorySlug === "retirement") {
    return (
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-border shadow-card-hover">
          <Image src={image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        {/* A slow, steady upward arc — the one abstract shape that reads as
            "long-term, headed somewhere good" without pretending to be an
            actual performance chart (no axis, no numbers, no claim). */}
        <svg className="pointer-events-none absolute -bottom-7 -start-7 -z-10 h-28 w-44 text-yellow-500/50 rtl:-scale-x-100" viewBox="0 0 176 112" fill="none" aria-hidden="true">
          <path d="M6 100C50 100 70 24 170 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <circle cx="170" cy="10" r="6" fill="currentColor" />
        </svg>
      </div>
    );
  }

  if (categorySlug === "energy") {
    return (
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border shadow-card-hover">
          <Image src={image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        <span className="absolute -top-3 -end-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 shadow-card-hover">
          <Lightning size={20} weight="fill" className="text-purple-900" />
        </span>
      </div>
    );
  }

  if (categorySlug === "communication") {
    return (
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border shadow-card-hover">
          <Image src={image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        </div>
        {/* A network-node dot grid — the connectivity motif, peeking out
            from behind the frame rather than laid over the photo itself. */}
        <div
          className="pointer-events-none absolute -bottom-6 -end-6 -z-10 h-32 w-32 text-purple-600/25"
          style={{ backgroundImage: "radial-gradient(currentColor 1.6px, transparent 1.6px)", backgroundSize: "14px 14px" }}
          aria-hidden="true"
        />
      </div>
    );
  }

  // insurance (default): a soft protective halo behind the frame, plus a
  // small shield badge overlapping the corner — "wrapped/guarded", the
  // most literal of the four but the one this category is actually about.
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-5 -z-10 rounded-[2.5rem] bg-purple-600/10 blur-2xl" aria-hidden="true" />
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border shadow-card-hover">
        <Image src={image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
      </div>
      <span className="absolute -bottom-4 -start-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white shadow-card-hover">
        <ShieldCheck size={20} weight="fill" className="text-purple-600" />
      </span>
    </div>
  );
}
