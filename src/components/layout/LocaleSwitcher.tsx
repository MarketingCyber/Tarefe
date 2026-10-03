"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GlobeSimple, CaretDown, Check } from "@phosphor-icons/react";
import { LOCALES, type Locale } from "@/lib/taxonomy";

// Native names, not translated ones — a Farsi speaker looks for "Deutsch,"
// not a Persian transliteration of "German." Same reasoning a language
// picker on any real multilingual site follows.
const NATIVE_NAME: Record<Locale, string> = { fa: "فارسی", de: "Deutsch", ru: "Русский" };

/**
 * Language switcher — icon-first dropdown, not a row of bare text codes
 * that only had room to appear at `xl:` (1280px+, cutting most laptop
 * viewports out entirely). Same interaction shape as AccountMenu.tsx's
 * dropdown (origin-aware scale+fade, Escape + backdrop to close,
 * pointer-events tied to `open` rather than an exit callback that isn't
 * guaranteed to fire) — one dropdown pattern for the whole header, not two.
 */
export function LocaleSwitcher({
  locale,
  variant = "compact",
}: {
  locale: Locale;
  /** "compact": the desktop header's icon-row look (unstyled, blends in
   * among the other header icons by design). "block": a full-width
   * bordered button with the language's own name spelled out — used in
   * MobileNav.tsx, where this control sits alone at the bottom of a long
   * drawer with nothing beside it for context. Found live (2026-10-01):
   * the compact style there read as a stray "FA" label, not a button —
   * a visitor reported they couldn't find the language switcher on
   * mobile at all, even though it was always present. */
  variant?: "compact" | "block";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Switching language keeps you on the same page, just in the other
  // locale — losing the path back to the homepage on every switch (the
  // bug in the old inline pills) is exactly the kind of thing that makes
  // a language picker feel broken.
  function localePath(target: Locale) {
    const rest = pathname.split("/").slice(2).join("/");
    return `/${target}${rest ? `/${rest}` : ""}`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={NATIVE_NAME[locale]}
        className={
          variant === "block"
            ? "press flex min-h-11 w-full items-center justify-between gap-2.5 rounded-full border border-border px-4 py-3 text-sm text-secondary transition-colors hover:bg-tint hover:text-purple-600"
            : "press flex h-9 items-center gap-1.5 rounded-full px-2.5 text-secondary transition-colors hover:bg-tint hover:text-purple-600"
        }
      >
        <span className="flex items-center gap-1.5">
          <GlobeSimple size={16} />
          {/* Block variant spells the language out ("فارسی") instead of
              the compact variant's bare code ("FA") — the code alone is
              exactly what read as a label rather than a control once it
              lost the header's row-of-icons context. */}
          <span className={variant === "block" ? "text-sm font-medium" : "font-latin text-xs font-semibold uppercase"}>
            {variant === "block" ? NATIVE_NAME[locale] : locale}
          </span>
        </span>
        <CaretDown size={12} weight="bold" className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      <div style={{ pointerEvents: open ? "auto" : "none" }} className="contents">
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <motion.div
                role="menu"
                aria-label={NATIVE_NAME[locale]}
                initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute end-0 top-full z-40 mt-2 w-40 overflow-hidden rounded-2xl border border-border bg-white p-1.5 shadow-card-hover"
              >
                {LOCALES.map((l) => (
                  <Link
                    key={l}
                    href={localePath(l)}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      l === locale ? "text-purple-600" : "text-body hover:bg-tint"
                    }`}
                  >
                    {NATIVE_NAME[l]}
                    {l === locale && <Check size={14} weight="bold" />}
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
