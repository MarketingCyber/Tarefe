"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import {
  X,
  WhatsappLogo,
  MagnifyingGlass,
  SquaresFour,
  Briefcase,
  SignOut,
  Shield,
  Lightning,
  WifiHigh,
  PiggyBank,
  ArrowRight,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useSession, signOut } from "next-auth/react";
import { track, EVENT } from "@/lib/analytics";
import type { Locale } from "@/lib/taxonomy";
import { TAXONOMY, byLocale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { Logo } from "./Logo";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { isStaffRole } from "@/lib/permissions";

// Same icon set as ServiceCategories.tsx/MegaMenu.tsx — one icon language
// for these categories across the whole site, not a third invented set.
const CATEGORY_ICON: Record<string, PhosphorIcon> = { shield: Shield, bolt: Lightning, wifi: WifiHigh, "piggy-bank": PiggyBank };

// Hydration-safe "are we on the client yet" check, same pattern as
// Marquee.tsx's own useSyncExternalStore use — needed because the portal
// target (document.body) doesn't exist during SSR, and a plain
// useState+useEffect flip trips the react-hooks/set-state-in-effect rule.
function subscribeNoop() {
  return () => {};
}
function getIsClient() {
  return true;
}
function getIsClientServer() {
  return false;
}

// The full taxonomy (all ~15 subcategories, 3 levels deep) is what the
// desktop mega menu is for — it has the width for it. A phone drawer
// doesn't: reproducing that same depth here meant one long, heavily
// nested accordion that took real scrolling just to reach "Contact."
// Category tiles that jump straight to each category's own page (where
// the full subcategory list already renders as a normal, readable page,
// not squeezed into a slide-out panel) cover the same ground in a
// fraction of the height, and search already reaches specific
// subcategories directly for anyone who knows what they want.
const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.23, 1, 0.32, 1] } },
};

export function MobileNav({
  locale,
  dict,
  open,
  onClose,
  onOpenSearch,
  whatsappNumber,
}: {
  locale: Locale;
  dict: Dictionary;
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  whatsappNumber: string;
}) {
  const reduce = useReducedMotion();
  const { data: session, status } = useSession();
  const isStaff = isStaffRole(session?.user.role);
  // Portaled to document.body (see the return statement) rather than
  // rendered in place — this component sits inside Navbar's `<header>`,
  // which is `position: sticky`. A `position: fixed` descendant of a
  // sticky ancestor doesn't get the viewport as its containing block the
  // way MDN's own position:fixed description implies; in every browser
  // tested here it instead resolves against the header's own box. The
  // observable bug: `inset-y-0` computed to the header's ~64px height
  // instead of the full viewport, so the "full-screen" drawer rendered as
  // a 64px sliver — confirmed directly via getBoundingClientRect() before
  // this fix, not guessed at. Portaling out from under the header is the
  // actual fix, not a inset/z-index tweak. `mounted` guards
  // `document.body` from ever being touched during SSR.
  const mounted = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);
  // The panel is pinned to the logical trailing edge (insetInlineEnd) so it
  // sits under the hamburger button in both directions — physically the
  // right in LTR, the left in Farsi's RTL. Motion's x/exit values are
  // physical transforms, so the slide-in direction has to be flipped by
  // hand to still come from that same trailing edge.
  const mirrored = locale === "fa";
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Same class of bug as HeroEntrance/DealtInStack/FlipCard fixed earlier
  // in this project: a hidden/backgrounded tab suspends the rAF ticker
  // Motion's slide-in and stagger animations run on, which can leave the
  // drawer and its contents stuck mid-transition — genuinely reachable on
  // mobile specifically, where switching apps mid-gesture is routine, not
  // an edge case. A plain setTimeout keeps running while backgrounded, so
  // it forces both the drawer's own transform and every staggered child
  // to their resting state well after the real animation (≤0.63s) should
  // have finished, regardless of whether rAF ever got to run it.
  useEffect(() => {
    if (!open) return;
    const settle = window.setTimeout(() => {
      if (drawerRef.current) drawerRef.current.style.transform = "translateX(0px)";
      scrollAreaRef.current?.querySelectorAll<HTMLElement>('[style*="opacity"]').forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }, 900);
    return () => window.clearTimeout(settle);
  }, [open]);

  const categories = TAXONOMY.filter((c) => c.published);
  const links = [
    { href: `/${locale}/guides`, label: dict.nav.guides },
    { href: `/${locale}/about`, label: dict.nav.about },
    { href: `/${locale}/contact`, label: dict.nav.contact },
    { href: `/${locale}/faq`, label: dict.nav.faq },
  ];

  if (!mounted) return null;

  return createPortal(
    // pointer-events tracks `open` directly on every render, independent of
    // whether Motion's exit animation ever fires its completion callback —
    // confirmed flaky once already in this codebase (QualificationWizard).
    // Without this, a stuck exit would leave an invisible full-screen nav
    // blocking every click on the page underneath, indefinitely.
    <div style={{ pointerEvents: open ? "auto" : "none" }} className="contents">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop — invisible in effect on a true phone (the panel is
                full-bleed there, nothing behind it to dim) but real once
                the panel becomes a capped-width drawer from `sm:` up, where
                it also doubles as a tap-to-close target. */}
            <motion.button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={onClose}
              className="fixed inset-0 z-[60] bg-purple-900/30 lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={dict.nav.services}
              className="fixed inset-y-0 z-[61] flex w-full flex-col bg-white sm:max-w-sm sm:shadow-card-hover lg:hidden"
              style={{ insetInlineEnd: 0 }}
              initial={reduce ? false : { x: mirrored ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: mirrored ? "-100%" : "100%" }}
              transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="container-page flex h-16 shrink-0 items-center justify-between border-b border-border">
                <Logo />
                {/* 44×44 minimum touch target. */}
                <button
                  type="button"
                  onClick={onClose}
                  className="press flex h-11 w-11 items-center justify-center rounded-full border border-border"
                  aria-label={locale === "fa" ? "بستن" : locale === "de" ? "Schließen" : "Закрыть"}
                >
                  <X size={18} />
                </button>
              </div>

              <motion.div
                ref={scrollAreaRef}
                variants={reduce ? undefined : container}
                initial="hidden"
                animate="visible"
                className="container-page flex-1 overflow-y-auto py-6"
              >
                <motion.button
                  variants={reduce ? undefined : item}
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSearch();
                  }}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-full border border-border px-4 py-3 text-sm text-secondary"
                >
                  <MagnifyingGlass size={16} />
                  {dict.nav.search}
                </motion.button>

                {/* Right under search, not at the bottom of the drawer
                    (2026-10-01, moved twice in one day) — first fix gave it
                    a visible bordered "block" style, which still wasn't
                    enough: signed-in visitors get a whole extra account
                    block (name, My Account, Sign Out) inserted above where
                    this used to sit, pushing it even further past the fold
                    than the signed-out case already was. A fixed position
                    near the top is reachable the instant the drawer opens,
                    regardless of how much renders below it. */}
                <motion.div variants={reduce ? undefined : item} className="mt-3">
                  <LocaleSwitcher locale={locale} variant="block" />
                </motion.div>

                <motion.p variants={reduce ? undefined : item} className="mb-3 mt-7 text-xs font-semibold uppercase tracking-wide text-secondary">
                  {dict.nav.services}
                </motion.p>
                {/* Stacked full-width rows, not a 2-column grid (2026-10-01)
                    — there are 3 top-level categories, and 3 into a 2-col
                    grid leaves a half-empty, visibly lopsided second row
                    (two tiles, then one tile floating beside a gap). A
                    single column has no such remainder regardless of count,
                    and reads cleanly whether there end up being 3 of these
                    or 5. */}
                <div className="grid gap-3">
                  {categories.map((cat) => {
                    const Icon = CATEGORY_ICON[cat.icon];
                    return (
                      <motion.div key={cat.slug} variants={reduce ? undefined : item}>
                        <Link
                          href={`/${locale}/services/${cat.slug}`}
                          onClick={onClose}
                          className="press flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-white p-3.5"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                            {Icon && <Icon size={18} weight="duotone" />}
                          </span>
                          <span className="text-sm font-semibold text-purple-900">{byLocale(locale, cat.title)}</span>
                          <ArrowRight size={14} weight="bold" className="ms-auto shrink-0 text-secondary rtl:rotate-180" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
                <motion.div variants={reduce ? undefined : item}>
                  <Link
                    href={`/${locale}/services`}
                    onClick={onClose}
                    className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-purple-600"
                  >
                    {dict.nav.services}
                    <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
                  </Link>
                </motion.div>

                <div className="mt-7 border-t border-border pt-1">
                  {links.map((link) => (
                    <motion.div key={link.href} variants={reduce ? undefined : item}>
                      <Link href={link.href} onClick={onClose} className="flex min-h-11 items-center border-b border-border py-3 text-base font-semibold text-purple-900">
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* No public sign-in entry point here either — /login still
                    works for staff navigating there directly by URL, but
                    an anonymous visitor sees nothing account-related at
                    all, matching AccountMenu.tsx's own desktop behavior. */}
                {status === "authenticated" && session?.user && (
                  <motion.div variants={reduce ? undefined : item} className="mt-6 rounded-2xl bg-tint p-3">
                    <p className="truncate px-1 text-sm font-bold text-purple-900">{session.user.name ?? session.user.email}</p>
                    <div className="mt-2 space-y-1">
                      <Link href="/app" onClick={onClose} className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-sm font-medium text-body">
                        <SquaresFour size={16} />
                        {dict.nav.myAccount}
                      </Link>
                      {isStaff && (
                        <Link href="/ops" onClick={onClose} className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-sm font-medium text-body">
                          <Briefcase size={16} />
                          {dict.nav.goToOps}
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          track(EVENT.LOGOUT, { locale });
                          signOut({ callbackUrl: `/${locale}` });
                        }}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2 text-start text-sm font-medium text-danger"
                      >
                        <SignOut size={16} />
                        {dict.nav.signOut}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* pb adds the real home-indicator inset on notched phones on
                  top of the normal py-4 — without it this bar sits flush
                  against (sometimes under) the gesture bar on an iPhone. */}
              <div
                className="container-page flex shrink-0 gap-3 border-t border-border py-4"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
              >
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-body"
                  aria-label={dict.nav.whatsapp}
                >
                  <WhatsappLogo size={20} weight="fill" />
                </a>
                <Link
                  href={`/${locale}/consultation`}
                  onClick={onClose}
                  className="press flex flex-1 items-center justify-center rounded-full bg-purple-600 px-4 text-sm font-semibold text-white"
                >
                  {dict.nav.consultation}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
