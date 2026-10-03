"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, WhatsappLogo, CaretDown, MagnifyingGlass } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { MegaMenu } from "./MegaMenu";
import { MobileNav } from "./MobileNav";
import { Logo } from "./Logo";
import { AccountMenu } from "./AccountMenu";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { SearchModal } from "@/components/navigation/SearchModal";
import { track, EVENT } from "@/lib/analytics";

const WHATSAPP_NUMBER = "4915224318691";

export function Navbar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Cmd/Ctrl+K opens search from anywhere — standard convention, not a
  // repeated-action-that-shouldn't-animate case (opening search is
  // occasional, unlike e.g. a keyboard shortcut fired hundreds of times/day).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <nav className="container-page relative flex h-16 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="shrink-0" aria-label="Tarefe">
          <Logo />
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-body transition-colors hover:text-purple-600"
              aria-expanded={menuOpen}
              onMouseEnter={() => setMenuOpen(true)}
              onClick={() => setMenuOpen(true)}
            >
              {dict.nav.services}
              <CaretDown size={14} weight="bold" className={menuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {/* Rendered immediately after its trigger (not at the end of <nav>) so
                keyboard tab order reaches the menu's links right after the button
                that opens it, instead of forcing a keyboard user through every
                other nav item first. Absolute positioning means this doesn't
                affect visual layout regardless of DOM placement. */}
            <MegaMenu locale={locale} dict={dict} open={menuOpen} onClose={() => setMenuOpen(false)} />
          </div>
          <Link href={`/${locale}/guides`} className="text-sm font-medium text-body transition-colors hover:text-purple-600">
            {dict.nav.guides}
          </Link>
          <Link href={`/${locale}/about`} className="text-sm font-medium text-body transition-colors hover:text-purple-600">
            {dict.nav.about}
          </Link>
          <Link href={`/${locale}/contact`} className="text-sm font-medium text-body transition-colors hover:text-purple-600">
            {dict.nav.contact}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Search/locale/WhatsApp are quiet utility actions — no border,
              just a hover tint — so they don't visually compete with the
              one thing on this bar that should actually stand out: the
              solid-purple consultation CTA. Giving every button the same
              bordered-circle weight was what made the CTA's wider text
              pill look mismatched/oversized next to them; the fix is
              contrast in weight, not forcing the CTA down to icon size. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-tint hover:text-purple-600"
            aria-label={dict.nav.search}
          >
            <MagnifyingGlass size={16} />
          </button>

          <div className="hidden lg:block">
            <LocaleSwitcher locale={locale} />
          </div>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(EVENT.WHATSAPP_CLICKED, { path: pathname, locale })}
            className="press hidden h-9 w-9 items-center justify-center rounded-full text-body transition-colors hover:bg-tint hover:text-purple-600 sm:flex"
            aria-label={dict.nav.whatsapp}
          >
            <WhatsappLogo size={18} weight="fill" />
          </a>

          <Link
            href={`/${locale}/consultation`}
            className="press hidden items-center rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-900 sm:inline-flex"
          >
            {dict.nav.consultation}
          </Link>

          <AccountMenu locale={locale} dict={dict} />

          <button
            type="button"
            className="press flex h-9 w-9 items-center justify-center rounded-full border border-border text-purple-900 lg:hidden"
            aria-label={locale === "fa" ? "منو" : locale === "de" ? "Menü" : "Меню"}
            onClick={() => setMobileOpen(true)}
          >
            <List size={20} />
          </button>
        </div>
      </nav>

      <MobileNav
        locale={locale}
        dict={dict}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenSearch={() => setSearchOpen(true)}
        whatsappNumber={WHATSAPP_NUMBER}
      />
      <SearchModal locale={locale} open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
