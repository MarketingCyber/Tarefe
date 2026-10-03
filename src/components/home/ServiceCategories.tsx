import Image from "next/image";
import Link from "next/link";
import { Shield, Lightning, PiggyBank, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import { TAXONOMY, byLocale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { TiltCard } from "@/components/shared/TiltCard";

const ICONS = { shield: Shield, bolt: Lightning, "piggy-bank": PiggyBank };

// Real, manually curated and verified photos (Unsplash) — one per
// published category, chosen for actual topical relevance rather than a
// random picsum.photos seed (see Hero.tsx for why that approach failed).
// Communication (wifi) isn't published — its card and photo were removed
// with it, not just hidden here.
const CATEGORY_IMAGE: Partial<Record<keyof typeof ICONS, string>> = {
  shield: "https://images.unsplash.com/photo-1589169011402-8b2cbd1ee593?q=80&w=800&auto=format&fit=crop", // family
  bolt: "https://images.unsplash.com/photo-1698922473061-b815ec32b1aa?q=80&w=800&auto=format&fit=crop", // German house with solar panels
  "piggy-bank": "https://images.unsplash.com/photo-1625690987114-86f5af994b49?q=80&w=800&auto=format&fit=crop", // elderly couple walking together, free Unsplash license (verified 2026-09-13)
};

export function ServiceCategories({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  // .find() by slug, not positional destructuring — TAXONOMY's order
  // isn't a contract this component should depend on, and in fact
  // changed under it once already (Retirement inserted 2026-09-04).
  const insurance = TAXONOMY.find((c) => c.slug === "insurance")!;
  const retirement = TAXONOMY.find((c) => c.slug === "retirement")!;
  const energy = TAXONOMY.find((c) => c.slug === "energy")!;

  return (
    <section className="py-16 md:py-24">
      <div className="container-page">
        <h2 className="max-w-[24ch] text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.categoriesTitle}</h2>
        <p className="mt-2 max-w-[55ch] text-sm text-secondary md:text-base">{dict.home.categoriesSubtitle}</p>

        {/*
          Three published categories (Communication/internet & mobile was
          removed from the site — see taxonomy.ts) — equal-weight cards in
          one row rather than the previous "Insurance featured 2x2 + two
          small cells" layout, which was specifically justified by
          Insurance being the only category with real depth (28 items vs.
          2-4 each). That gap has narrowed (Insurance: 7 subcategory
          groups, Retirement: 4 items) enough that unequal sizing would
          read as arbitrary rather than meaningful — a plain, honest grid
          instead of forcing a "one big + others small" shape that no
          longer reflects reality.
        */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CategoryCard locale={locale} category={insurance} />
          <CategoryCard locale={locale} category={retirement} />
          <CategoryCard locale={locale} category={energy} />
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  locale,
  category,
  featured,
  className,
  comingSoonLabel,
}: {
  locale: Locale;
  category: (typeof TAXONOMY)[number];
  featured?: boolean;
  className?: string;
  comingSoonLabel?: string;
}) {
  const Icon = ICONS[category.icon as keyof typeof ICONS];
  const image = CATEGORY_IMAGE[category.icon as keyof typeof ICONS];
  const disabled = !category.published;

  const cardBody = (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all ${
        disabled ? "border-border bg-tint" : "border-border bg-white hover:-translate-y-0.5 hover:shadow-card-hover"
      } ${featured ? "min-h-[280px]" : "min-h-[150px]"}`}
    >
      {image && (
        // aspect-ratio, not a fixed height — the fixed h-20 (80px) this
        // replaced was sized for the old 2x2-featured layout's small
        // side cells, which were much narrower than a card in today's
        // equal-weight 4-up grid. At the ~250-300px+ a card actually
        // renders at now, 80px produced a wide, cramped letterbox strip
        // instead of a real photo. aspect-[4/3] scales with the card's
        // actual width at every breakpoint instead of fighting it.
        <div className={`relative shrink-0 overflow-hidden ${featured ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
          <Image
            src={image}
            alt=""
            fill
            sizes={featured ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 20vw, 50vw"}
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        </div>
      )}
      <div className={`flex flex-1 flex-col justify-between ${featured ? "p-6 md:p-8" : "p-6"}`}>
        <div className="flex items-start justify-between">
          <span className={`flex items-center justify-center rounded-xl ${featured ? "h-12 w-12" : "h-10 w-10"} bg-purple-600/10 text-purple-600`}>
            <Icon size={featured ? 24 : 20} weight="duotone" />
          </span>
          {comingSoonLabel && (
            <span className="rounded-full border border-border-strong bg-white px-2.5 py-0.5 text-[11px] font-medium text-secondary">{comingSoonLabel}</span>
          )}
        </div>
        <div>
          <h3 className={`font-bold text-purple-900 ${featured ? "text-2xl" : "text-lg"}`}>{byLocale(locale, category.title)}</h3>
          <p className={`mt-2 text-secondary ${featured ? "max-w-[38ch] text-sm" : "text-xs"}`}>{byLocale(locale, category.description)}</p>
          {!disabled && (
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600">
              {byLocale(locale, category.title)}
              <ArrowRight size={14} weight="bold" className="rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Was reserved for the single "featured" 2x2 card before the 4-category
  // grid became equal-weight (2026-09-04) — now every real, clickable
  // card gets it, and only the disabled "coming soon" state (Finance)
  // doesn't, since that one isn't actually interactive.
  const content = !disabled ? <TiltCard className="h-full">{cardBody}</TiltCard> : cardBody;

  if (disabled) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={`/${locale}/services/${category.slug}`} className={className}>
      {content}
    </Link>
  );
}
