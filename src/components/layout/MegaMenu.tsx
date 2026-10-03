"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Shield, Lightning, WifiHigh, PiggyBank, CaretRight, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import type { Locale, Subcategory, ProductType } from "@/lib/taxonomy";
import { TAXONOMY, byLocale, isCollapsedSubcategory } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";

// Same icon set already used for these exact categories on the homepage
// (ServiceCategories.tsx) — reused here rather than invented, so the mega
// menu visually agrees with the rest of the site instead of introducing a
// second icon language for the same categories.
const CATEGORY_ICON = { shield: Shield, bolt: Lightning, wifi: WifiHigh, "piggy-bank": PiggyBank };

export function MegaMenu({
  locale,
  dict,
  open,
  onClose,
}: {
  locale: Locale;
  dict: Dictionary;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const insurance = TAXONOMY.find((c) => c.slug === "insurance")!;
  const retirement = TAXONOMY.find((c) => c.slug === "retirement")!;
  const energy = TAXONOMY.find((c) => c.slug === "energy")!;
  // Communication (internet/mobile) is unpublished — not shown here, see
  // taxonomy.ts's own comment on why the category stays in the data model.

  return (
    // pointer-events tracks `open` directly on every render, independent of
    // whether Motion's exit animation ever fires its completion callback —
    // confirmed flaky once already in this codebase (QualificationWizard).
    // Without this, a stuck exit would leave an invisible menu panel
    // blocking clicks on whatever page content sits beneath it.
    <div style={{ pointerEvents: open ? "auto" : "none" }} className="contents">
      <AnimatePresence>
        {open && (
          <motion.div
            // Not role="menu": that ARIA pattern is for command/action menus
            // (menu bars, pull-downs of operations) and requires menuitem
            // descendants plus arrow-key navigation — neither exists here.
            // This panel is a plain list of navigation links; asserting
            // role="menu" without that supporting structure is a known
            // anti-pattern that pushes screen readers into a "menu
            // navigation" mode whose expected keys (arrows) don't work,
            // which is worse than no role at all. Native links need none.
            aria-label={dict.nav.services}
            // This dropdown opens on every hover of a nav item a returning
            // visitor will trigger many times per session — per the
            // "how often will someone see this" framework, that argues for
            // restrained motion, not a flourish. Same fast fade+lift as
            // before; the redesign spends its effort on layout/hierarchy
            // (the icon-anchored groups below), not on a bigger entrance.
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-x-0 top-full z-40 overflow-y-auto border-b border-border bg-white shadow-card-hover"
            // Inline style, not a Tailwind arbitrary-value class: confirmed
            // via computed styles that max-h-[calc(100vh-4rem)] wasn't
            // generating a CSS rule at all here (getComputedStyle showed
            // maxHeight: "none" despite the class being present in the
            // DOM) — with Sach's 28 items now shown inline, the panel
            // grows to ~1080px tall and would spill past the viewport on
            // a typical 720-800px-tall laptop screen with nothing to
            // scroll it back into view. This sidesteps whatever the
            // build-time cause is rather than chasing it.
            style={{ maxHeight: "calc(100vh - 4rem)" }}
            onMouseLeave={onClose}
          >
            <div className="container-page flex flex-col gap-8 py-8 lg:flex-row lg:items-start lg:gap-8">
              {/* Insurance: restructured 2026-09-04 from a fixed 3-way
                  Sach/KV/LV split (a real German industry classification
                  that doesn't map onto the client's 7-group reference
                  list) to a generic grid over whatever subcategories
                  taxonomy.ts actually has — adding/removing a group here
                  needs no matching change in this component. */}
              <div className="lg:w-[60%]">
                <GroupHeader icon="shield" href={`/${locale}/services/insurance`} label={byLocale(locale, insurance.title)} onClick={onClose} />
                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
                  {insurance.subcategories.map((sub) =>
                    isCollapsedSubcategory(sub) ? (
                      <div key={sub.slug}>
                        <SubHeading href={`/${locale}/services/insurance/${sub.slug}`} label={byLocale(locale, sub.title)} onClick={onClose} />
                      </div>
                    ) : (
                      <SubColumn
                        key={sub.slug}
                        label={byLocale(locale, sub.title)}
                        href={`/${locale}/services/insurance/${sub.slug}`}
                        locale={locale}
                        basePath={`/${locale}/services/insurance/${sub.slug}`}
                        subcategory={sub}
                        onClose={onClose}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="hidden self-stretch border-s border-border lg:block" />

              {/* Retirement: 4 single-page items (no productType level, see
                  taxonomy.ts's own comment on why these skip the price-
                  comparison pattern) — same narrow-column treatment as
                  Energy below. */}
              <div className="lg:w-[18%]">
                <GroupHeader icon="piggy-bank" href={`/${locale}/services/retirement`} label={byLocale(locale, retirement.title)} onClick={onClose} />
                <ul className="mt-4 space-y-1.5">
                  {retirement.subcategories.map((sub) => (
                    <MenuLink key={sub.slug} href={`/${locale}/services/retirement/${sub.slug}`} label={byLocale(locale, sub.title)} onClick={onClose} />
                  ))}
                </ul>
              </div>

              <div className="hidden self-stretch border-s border-border lg:block" />

              {/* Energy: only two real items, so it stays a narrow column rather than padding out to match the others. */}
              <div className="lg:w-[17%]">
                <GroupHeader icon="bolt" href={`/${locale}/services/energy`} label={byLocale(locale, energy.title)} onClick={onClose} />
                <ul className="mt-4 space-y-1.5">
                  {energy.subcategories.map((sub) => (
                    <MenuLink key={sub.slug} href={`/${locale}/services/energy/${sub.slug}`} label={byLocale(locale, sub.title)} onClick={onClose} />
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The icon-anchored group header — Insurance/Energy/Communication/Finance.
 * Reuses the exact icon-chip language from the homepage's category cards
 * (bg-purple-600/10 text-purple-600, duotone) so the two surfaces read as
 * the same product, and gives the eye four clear landing zones instead of
 * scanning 40+ links of identical weight. `href` is optional so Finance
 * (not yet published) renders as a label, not a link to nowhere. */
function GroupHeader({
  icon,
  href,
  label,
  onClick,
}: {
  icon: keyof typeof CATEGORY_ICON;
  href: string | undefined;
  label: string;
  onClick: () => void;
}) {
  const Icon: PhosphorIcon = CATEGORY_ICON[icon];
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600 transition-transform duration-150 ease-out group-hover:scale-105">
        <Icon size={18} weight="duotone" />
      </span>
      <span className="text-sm font-bold text-purple-900">{label}</span>
    </>
  );
  if (!href) {
    return <div className="flex items-center gap-2.5">{content}</div>;
  }
  return (
    <Link href={href} onClick={onClick} className="group flex items-center gap-2.5">
      {content}
    </Link>
  );
}

/** A Sach/KV/LV/Mobile/Internet sub-heading: the "browse this whole group"
 * link one level below the icon header. The caret marks it as a hub
 * (leads to a listing of the items below it) rather than a specific
 * product, which the plain ProductTypeLinks beneath it are. */
function SubHeading({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="group flex items-center gap-1 text-xs font-bold text-purple-900 transition-colors hover:text-purple-600">
      {label}
      <CaretRight size={11} weight="bold" className="text-secondary transition-transform rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

function SubColumn({
  label,
  href,
  locale,
  basePath,
  subcategory,
  onClose,
}: {
  label: string;
  href: string;
  locale: Locale;
  basePath: string;
  subcategory: Subcategory;
  onClose: () => void;
}) {
  return (
    <div>
      <SubHeading href={href} label={label} onClick={onClose} />
      <ul className="mt-2.5 space-y-1.5">
        {subcategory.productTypes.map((pt) => (
          <ProductTypeLink key={pt.slug} locale={locale} href={`${basePath}/${pt.slug}`} productType={pt} onClick={onClose} />
        ))}
      </ul>
    </div>
  );
}

function ProductTypeLink({ locale, href, productType, onClick }: { locale: Locale; href: string; productType: ProductType; onClick: () => void }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="block text-xs leading-relaxed text-body transition-[color,transform] duration-150 ease-out hover:translate-x-0.5 hover:text-purple-600 rtl:hover:-translate-x-0.5"
      >
        {byLocale(locale, productType.title)}
      </Link>
    </li>
  );
}

function MenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="block text-xs leading-relaxed text-body transition-[color,transform] duration-150 ease-out hover:translate-x-0.5 hover:text-purple-600 rtl:hover:-translate-x-0.5"
      >
        {label}
      </Link>
    </li>
  );
}
