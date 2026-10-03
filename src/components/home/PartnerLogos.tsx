import Image from "next/image";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { Marquee } from "@/components/shared/Marquee";
import allianz from "@/assets/logos/allianz.png";
import axa from "@/assets/logos/axa.png";
import vattenfall from "@/assets/logos/vattenfall.png";
import debeka from "@/assets/logos/debeka.png";
import signalIduna from "@/assets/logos/signal-iduna.png";
import hanseMerkur from "@/assets/logos/hansemerkur.png";
import eon from "@/assets/logos/eon.svg";

// Real, signed partners — confirmed 2026-09-09, replacing the earlier
// taxonomy-derived text strip (see git history) that this project built
// specifically *because* no real partnership existed yet. That's no
// longer true for these 7; showing their actual logos is accurate now,
// not the unearned claim the original brand-logo strip was.
const PARTNERS = [
  { name: "Allianz", src: allianz },
  { name: "AXA", src: axa },
  { name: "Vattenfall", src: vattenfall },
  { name: "Debeka", src: debeka },
  { name: "SIGNAL IDUNA", src: signalIduna },
  { name: "HanseMerkur", src: hanseMerkur },
  { name: "E.ON", src: eon },
];

export function PartnerLogos({ dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="border-b border-border py-10">
      <div className="container-page">
        <p className="mb-6 text-center text-xs font-medium text-secondary">{dict.home.partnersTitle}</p>
      </div>
      {/* Marquee itself falls back to a plain wrapped, centered, static
          list (no duplication, nothing clipped) under
          prefers-reduced-motion or before JS mounts — see its own
          comment. gap-y-6 only matters in that fallback state.

          Spacing lives in each item's own `px-7` (28px a side → the same
          56px between neighbours a `gap-x-14` gave), NOT in a container
          gap — that's what makes the track exactly two equal halves and
          the keyframe's flat -50% exact. See Marquee.tsx's comment.

          `loading="eager"`, deliberately: the browser's lazy-load
          heuristic works off an image's *layout* position, and this track
          is ~2000px wide with the whole duplicate copy sitting far
          outside the viewport in layout terms — so lazily-loaded logos
          never got fetched until the loop had already carried them into
          view, arriving blank and popping in a beat later. That was the
          "third repeat appears with a delay". Seven small logos, so
          eager-loading the lot is cheap.

          No hover state on the logos themselves — a :hover style on
          content that's continuously scrolling under a stationary cursor
          toggles on and off as each logo crosses the pointer, firing an
          uncontrolled opacity/filter "pop" with no relation to real user
          intent. Matches Marquee.tsx's own documented intent for this
          content anyway — decorative background texture, "not a control
          competing for attention". Full color, no dimming: these are
          real, named partners, not placeholder text standing in for a
          claim. */}
      <Marquee className="items-center gap-y-6">
        {PARTNERS.map((partner) => (
          <span key={partner.name} className="flex shrink-0 items-center px-7">
            <Image src={partner.src} alt={partner.name} loading="eager" className="h-6 w-auto object-contain sm:h-7" />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
