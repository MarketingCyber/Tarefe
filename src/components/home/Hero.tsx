import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle, Wallet, SealCheck, ChatCircleText } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { HeroEntrance } from "./HeroEntrance";
import { MagneticCta } from "@/components/shared/MagneticCta";

// Fixed 1:1 mapping to dict.home.heroTrust's 3 entries (free/no hidden
// cost, IHK-certified advisors, support in the visitor's own language) —
// same order in all three locale dictionaries. ChatCircleText matches the
// icon WhyTarefe.tsx already uses for the identical advisor claim, not a
// fresh choice made in isolation.
const TRUST_ICONS = [Wallet, SealCheck, ChatCircleText] as const;

export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="border-b border-border bg-gradient-to-b from-tint to-white">
      <HeroEntrance>
        <div className="container-page grid items-center gap-10 pb-16 pt-10 md:grid-cols-2 md:pt-20">
          <div>
            <span
              data-hero-item
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-border-strong bg-white px-3 py-1 text-xs font-semibold text-purple-600"
            >
              {/* The one gold touch on the page — a status dot, not decoration:
                  reads as "live/active service", spent in exactly one place
                  per the 60/30/10 palette (docs/design-system.md). */}
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
              {dict.home.heroEyebrow}
            </span>
            <h1 data-hero-headline className="max-w-[17ch] text-balance text-4xl font-extrabold leading-[1.1] text-purple-900 sm:text-5xl md:text-6xl">
              {dict.home.heroTitle}
            </h1>
            <p data-hero-item className="mt-5 max-w-[46ch] text-base leading-relaxed text-body md:text-lg">
              {dict.home.heroSubtitle}
            </p>

            <div data-hero-item className="mt-7 flex flex-wrap items-center gap-3">
              <MagneticCta>
                <Link
                  href={`/${locale}/consultation`}
                  className="press inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900"
                >
                  {dict.cta.freeConsultation}
                  <ArrowRight size={16} weight="bold" className="rtl:rotate-180" />
                </Link>
              </MagneticCta>
              <Link
                href={`/${locale}/services`}
                className="press inline-flex items-center gap-2 rounded-full border border-border-strong px-6 py-3.5 text-sm font-semibold text-purple-900 transition-colors hover:border-purple-600 hover:text-purple-600"
              >
                {dict.nav.services}
              </Link>
            </div>
          </div>

          <div data-hero-item className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-tint shadow-card-hover">
              {/* Real, manually curated photo (Unsplash), verified by
                  actually viewing it before use — a prior picsum.photos
                  seed here turned out to be a random seagull-at-a-pier
                  photo with zero relation to its "advisor-consultation"
                  seed name (picsum seeds pick an arbitrary stock photo,
                  they are not a keyword search). This one genuinely shows
                  a two-person advisory meeting. */}
              <Image
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1000&auto=format&fit=crop"
                alt=""
                fill
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div
              data-hero-badge
              className="absolute -bottom-5 start-4 flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 shadow-card-hover sm:-bottom-6 sm:start-6"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success-bg text-success">
                <CheckCircle size={18} weight="fill" />
              </span>
              <span className="text-xs font-semibold text-purple-900">{dict.cta.checkEligibility}</span>
            </div>
          </div>
        </div>
      </HeroEntrance>

      {/* Three real, load-bearing claims (dict.home.heroTrust) — was a thin
          wrapped inline list, easy to skim past. Equal-weight cards make
          each one its own scannable unit instead of one run-on line. */}
      <div className="container-page border-t border-border py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {dict.home.heroTrust.map((item, i) => {
            const Icon = TRUST_ICONS[i];
            return (
              <div key={item} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600/10 text-purple-600">
                  <Icon size={17} weight="duotone" />
                </span>
                <span className="text-sm font-medium text-body">{item}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
