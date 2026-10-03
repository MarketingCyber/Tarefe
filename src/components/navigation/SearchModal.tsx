"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MagnifyingGlass, X, Tag, FolderOpen, Package, Question, BookOpen, ArrowRight, Shield, Lightning, WifiHigh, PiggyBank } from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { TAXONOMY, byLocale, type Locale } from "@/lib/taxonomy";
import { search, type SearchResult } from "@/lib/search-index";
import { track, EVENT } from "@/lib/analytics";

const TYPE_ICON: Record<SearchResult["type"], PhosphorIcon> = { category: Tag, subcategory: FolderOpen, product: Package, faq: Question, guide: BookOpen };
const CATEGORY_ICON: Record<string, PhosphorIcon> = { shield: Shield, bolt: Lightning, wifi: WifiHigh, "piggy-bank": PiggyBank };

const TYPE_LABEL: Record<SearchResult["type"], Record<Locale, string>> = {
  category: { fa: "دسته‌بندی", de: "Kategorie", ru: "Категория" },
  subcategory: { fa: "زیرگروه", de: "Unterkategorie", ru: "Подкатегория" },
  product: { fa: "خدمت", de: "Leistung", ru: "Услуга" },
  faq: { fa: "سوال متداول", de: "FAQ", ru: "Вопрос" },
  guide: { fa: "راهنما", de: "Ratgeber", ru: "Гид" },
};
const PLACEHOLDER: Record<Locale, string> = {
  fa: "جستجوی خدمات، بیمه، انرژی...",
  de: "Dienstleistungen, Versicherung, Energie suchen...",
  ru: "Поиск услуг, страхования, энергии...",
};
const EMPTY: Record<Locale, string> = {
  fa: "نتیجه‌ای پیدا نشد.",
  de: "Keine Ergebnisse gefunden.",
  ru: "Ничего не найдено.",
};
const POPULAR_LABEL: Record<Locale, string> = { fa: "دسته‌بندی‌های پرطرفدار", de: "Beliebte Kategorien", ru: "Популярные категории" };

// Hydration-safe "are we on the client yet" check, same pattern as
// MobileNav.tsx/Marquee.tsx — needed because the portal target
// (document.body) doesn't exist during SSR.
function subscribeNoop() {
  return () => {};
}
function getIsClient() {
  return true;
}
function getIsClientServer() {
  return false;
}

export function SearchModal({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const router = useRouter();
  // Portaled to document.body (see the return statement) rather than
  // rendered in place — this component sits inside Navbar's `<header>`,
  // which is `position: sticky`. A `position: fixed` descendant of a
  // sticky ancestor doesn't reliably get the viewport as its containing
  // block — the same bug already fixed once in MobileNav.tsx. The
  // observable symptom here: the scrim only covered a strip near the
  // header instead of the full page (an odd dimmed gap above the input,
  // rest of the page not dimmed at all), and clicking "outside" the
  // panel did nothing because most of the page genuinely wasn't under
  // the backdrop element to begin with. Portaling out from under the
  // header is the actual fix, not a z-index or inset tweak.
  const mounted = useSyncExternalStore(subscribeNoop, getIsClient, getIsClientServer);

  const popularCategories = useMemo(() => TAXONOMY.filter((c) => c.published), []);

  // Derived directly from query/locale rather than mirrored into its own
  // state-plus-effect — avoids the react-hooks/set-state-in-effect
  // cascading-render footgun and there's no async gap to hide anyway
  // (search() is a synchronous in-memory lookup).
  const results = useMemo(() => search(query, locale), [query, locale]);

  // Reset the query when the modal opens, and re-focus the input. Done as
  // a render-time state adjustment (comparing against a *state* snapshot
  // of the previous `open` value, not a ref — the project's react-compiler
  // lint rules forbid reading/writing refs during render) rather than
  // inside a useEffect, per React's own documented pattern for this exact
  // case: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && query !== "") setQuery("");
  }

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Same render-time-adjustment pattern for activeIndex: reset to 0
  // whenever the result set itself changes (new query/locale), so
  // keyboard nav never lands on a stale index after typing.
  const [prevResults, setPrevResults] = useState(results);
  if (results !== prevResults) {
    setPrevResults(results);
    if (activeIndex !== 0) setActiveIndex(0);
  }

  useEffect(() => {
    // `search` was defined in the EVENT catalog but never fired — this is
    // the real search UI it was meant for. Debounced (fires 500ms after
    // typing settles, not per keystroke) so "insurance" doesn't log 9
    // separate events; skips anything under the same 2-char floor the
    // empty-state message already uses.
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const timer = setTimeout(() => {
      track(EVENT.SEARCH, { locale, metadata: { query: trimmed, resultCount: results.length } });
    }, 500);
    return () => clearTimeout(timer);
  }, [query, locale, results]);

  // Grouped by type (category → subcategory → product), not a flat list —
  // scanning "which of these is actually a top-level category vs. a
  // specific plan" is real work in a flat list once there are more than a
  // couple of results. Order within each group is still relevance-sorted
  // by search() itself.
  const groups = useMemo(() => {
    const order: SearchResult["type"][] = ["category", "subcategory", "product", "guide", "faq"];
    return order.map((type) => ({ type, items: results.filter((r) => r.type === type) })).filter((g) => g.items.length > 0);
  }, [results]);
  const flatResults = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (flatResults.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flatResults.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const target = flatResults[activeIndex];
        if (target) {
          onClose();
          router.push(target.href);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, flatResults, activeIndex, router]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!mounted) return null;

  return createPortal(
    // pointer-events tracks `open` directly on every render, independent of
    // whether Motion's exit animation ever fires its completion callback —
    // confirmed flaky once already in this codebase (QualificationWizard).
    // Without this, a stuck exit would leave an invisible `fixed inset-0`
    // overlay blocking every click on the page underneath, indefinitely.
    <div style={{ pointerEvents: open ? "auto" : "none" }} className="contents">
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={PLACEHOLDER[locale]}
          // A plain scrim, not backdrop-blur — this is something people
          // reach for repeatedly in a session, not a rare, significant
          // interruption; a heavy blur on every use reads as more
          // disruptive than a quick lookup warrants. Sits just below the
          // header instead of floating mid-screen, so it reads as a
          // dropdown extension of the icon just clicked.
          className="fixed inset-0 z-[70] flex items-start justify-center bg-purple-900/30 px-4 pt-20"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white shadow-card-hover"
            initial={reduce ? false : { opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <MagnifyingGlass size={20} className="shrink-0 text-purple-600" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={PLACEHOLDER[locale]}
                className="flex-1 bg-transparent text-base text-purple-900 outline-none placeholder:text-secondary"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label={locale === "fa" ? "بستن" : locale === "de" ? "Schließen" : "Закрыть"}
                className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-tint hover:text-purple-600"
              >
                <X size={16} />
              </button>
            </div>

            <div ref={listRef} className="max-h-[60vh] overflow-y-auto border-t border-border p-2">
              {query.trim().length < 2 ? (
                <div className="p-2">
                  <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-secondary">{POPULAR_LABEL[locale]}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {popularCategories.map((cat) => {
                      const Icon = CATEGORY_ICON[cat.icon];
                      return (
                        <Link
                          key={cat.slug}
                          href={`/${locale}/services/${cat.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-2.5 rounded-xl border border-border p-3 transition-colors hover:border-purple-600/40 hover:bg-tint"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                            {Icon && <Icon size={16} weight="duotone" />}
                          </span>
                          <span className="truncate text-sm font-medium text-purple-900">{byLocale(locale, cat.title)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-secondary">{EMPTY[locale]}</p>
              ) : (
                groups.map((group) => (
                  <div key={group.type} className="mb-1 last:mb-0">
                    <p className="px-3 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-secondary first:pt-2">{TYPE_LABEL[group.type][locale]}</p>
                    {group.items.map((r) => {
                      const Icon = TYPE_ICON[r.type];
                      const index = flatResults.indexOf(r);
                      const active = index === activeIndex;
                      return (
                        <Link
                          key={r.href + r.title}
                          data-index={index}
                          href={r.href}
                          onClick={onClose}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${active ? "bg-tint" : ""}`}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                            <Icon size={16} weight="duotone" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-purple-900">{r.title}</span>
                            {r.subtitle && <span className="block truncate text-xs text-secondary">{r.subtitle}</span>}
                          </span>
                          <ArrowRight size={13} weight="bold" className={`shrink-0 text-purple-600 rtl:rotate-180 transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
                        </Link>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Keyboard hint footer — each <kbd> is individually dir="ltr"
                isolated (not the whole row) so a multi-character symbol
                like "Esc" can't get bidi-reordered the way the old ⌘K hint
                did, while the row itself still flows in the page's own
                reading order alongside its Persian/German/Russian labels,
                instead of the whole footer flipping to read LTR inside an
                RTL page. Only worth showing when there's a list to
                navigate. */}
            {flatResults.length > 0 && (
              <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-secondary">
                <span className="flex items-center gap-1.5">
                  <kbd dir="ltr" className="font-latin rounded border border-border px-1.5 py-0.5">↑↓</kbd>
                  {locale === "fa" ? "پیمایش" : locale === "de" ? "Navigieren" : "Навигация"}
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd dir="ltr" className="font-latin rounded border border-border px-1.5 py-0.5">↵</kbd>
                  {locale === "fa" ? "انتخاب" : locale === "de" ? "Auswählen" : "Выбрать"}
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd dir="ltr" className="font-latin rounded border border-border px-1.5 py-0.5">Esc</kbd>
                  {locale === "fa" ? "بستن" : locale === "de" ? "Schließen" : "Закрыть"}
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>,
    document.body
  );
}
