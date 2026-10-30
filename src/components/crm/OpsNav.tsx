"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { UserRole } from "@prisma/client";
import { track, EVENT } from "@/lib/analytics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  SignOut,
  House,
  List,
  X,
  SquaresFour,
  Target,
  ListChecks,
  Funnel,
  UsersThree,
  ClipboardText,
  FileText,
  Headset,
  ChatsCircle,
  ChartBar,
  BookOpen,
  Question,
  ChatCircleText,
  Images,
  ShieldCheck,
  IdentificationBadge,
  Lightning,
  CaretDown,
  Database,
  type Icon,
} from "@phosphor-icons/react";
import { NotificationBell, type NotificationItem } from "@/components/shared/NotificationBell";
import { canAccessPipeline, canAccessContent, canAccessAnalytics, isAdminRole } from "@/lib/permissions";

/** Omitted `visible` means "every staff role sees this" (e.g. "امنیت" — everyone manages their own MFA, see /ops/security itself having no role gate). */
/** `app`: belongs to the mobile app, shown only while it is switched on (lib/app-flag.ts). */
type NavItem = { href: string; label: string; icon: Icon; visible?: (role: UserRole) => boolean; app?: true };
type NavGroup = { id: string; label: string; items: NavItem[] };

/**
 * Icons reuse the exact entity → icon mapping already established by the
 * EmptyState icons on each of these pages' own list views (see the Phase-2
 * "EmptyState wiring" round) — same visual vocabulary, not a fresh choice
 * per row.
 *
 * Grouped 2026-10-01 — the previous flat 14-item list gave "تسک‌ها" and
 * "امنیت" the same visual weight regardless of how often either is
 * actually opened. "نمای کلی"/"کارهای من" stay pinned above the groups
 * (opened every session, not worth a category toggle); everything else is
 * collapsible per category — see NavGroupSection for the expand/collapse
 * mechanics and STORAGE_KEY for why it remembers state per browser.
 *
 * Same pass added LEAD_MANAGER/CONTENT_EDITOR/ANALYST (src/lib/permissions.ts)
 * — an item with no `visible` check is open to every staff role; پایپ‌لاین
 * and محتوای سایت are gated whole (a role that can't see one item in
 * either can't see any of them), سیستم is gated per item since "امنیت" is
 * everyone's own MFA settings but "آنالیتیکس" isn't. Each page still
 * enforces its own access server-side (this only decides what the nav
 * *offers* — never the actual security boundary).
 */
const PINNED_ITEMS: NavItem[] = [
  { href: "/ops", label: "نمای کلی", icon: SquaresFour },
  { href: "/ops/my-work", label: "کارهای من", icon: Target },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "pipeline",
    label: "پایپ‌لاین",
    items: [
      { href: "/ops/tasks", label: "تسک‌ها", icon: ListChecks },
      { href: "/ops/leads", label: "لیدها", icon: Funnel },
      { href: "/ops/customers", label: "مشتریان", icon: UsersThree },
      { href: "/ops/applications", label: "درخواست‌ها", icon: ClipboardText },
      { href: "/ops/contracts", label: "قراردادها", icon: FileText },
      { href: "/ops/conversations", label: "گفتگوهای اپ", icon: ChatsCircle, app: true },
      { href: "/ops/tickets", label: "تیکت‌ها", icon: Headset },
      { href: "/ops/old-crm", label: "CRM قدیم", icon: Database },
    ],
  },
  {
    id: "content",
    label: "محتوای سایت",
    items: [
      { href: "/ops/guides", label: "راهنماها", icon: BookOpen },
      { href: "/ops/energy-tariffs", label: "تعرفه‌های برق و گاز", icon: Lightning },
      { href: "/ops/faq", label: "سوالات متداول", icon: Question },
      { href: "/ops/testimonials", label: "نظرات مشتریان", icon: ChatCircleText },
      { href: "/ops/app-banners", label: "اسلایدر اپ", icon: Images, app: true },
    ],
  },
  {
    id: "system",
    label: "سیستم",
    items: [
      { href: "/ops/analytics", label: "آنالیتیکس", icon: ChartBar, visible: canAccessAnalytics },
      { href: "/ops/security", label: "امنیت", icon: ShieldCheck },
    ],
  },
];

/** Shown only to ADMIN — an advisor following this link would just get redirected by the page's own guard, so it's never offered in their nav at all. Appended to "سیستم", the group it fits — staff management is the same kind of behind-the-scenes/admin concern as analytics and security. */
const ADMIN_NAV_ITEM: NavItem = { href: "/ops/team", label: "کارکنان", icon: IdentificationBadge };

/** Per-browser, not per-account — a collapsed group is a "I don't use this on THIS screen" preference, same reasoning as any other sidebar-memory pattern (VS Code, Linear). */
const STORAGE_KEY = "tarefe-ops-nav-collapsed";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/ops" && pathname.startsWith(`${href}/`));
}

function groupContaining(pathname: string, groups: NavGroup[]): string | null {
  return groups.find((g) => g.items.some((item) => isActive(pathname, item.href)))?.id ?? null;
}

/** Closed by default, except the group holding the current page — or, when
 * the page isn't in any group (the two pinned items), the first group, so
 * a first-time visitor always sees at least one open instead of an
 * all-closed wall. */
function defaultCollapsed(pathname: string, groups: NavGroup[]): Set<string> {
  const active = groupContaining(pathname, groups) ?? groups[0]?.id ?? null;
  return new Set(groups.map((g) => g.id).filter((id) => id !== active));
}

/** null means "nothing stored" (as opposed to an empty array, a legitimate
 * "user explicitly reopened everything" state) — the caller falls back to
 * defaultCollapsed() only in the null case. */
function readStoredCollapsed(): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-purple-600/10 text-purple-600" : "text-body hover:bg-tint hover:text-purple-600"
      }`}
    >
      <item.icon size={17} weight={active ? "fill" : "regular"} />
      {item.label}
    </Link>
  );
}

function NavGroupSection({
  group,
  pathname,
  collapsed,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const reduce = useReducedMotion();
  // Same custom ease-out this project already uses for entrances
  // (Reveal.tsx) — one curve, not a second one invented for this
  // component. Expand and collapse both enter/exit rather than "move on
  // screen", so both get ease-out (never ease-in — it delays the very
  // moment being watched most closely); collapse is faster than expand,
  // since closing is the system responding to a decision already made
  // while opening is still revealing something new to read.
  const EASE_OUT = [0.16, 1, 0.3, 1] as const;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:text-purple-600"
      >
        {group.label}
        <CaretDown
          size={12}
          weight="bold"
          className={collapsed ? "-rotate-90" : ""}
          style={{ transition: `transform ${collapsed ? 150 : 200}ms ${reduce ? "linear" : `cubic-bezier(${EASE_OUT.join(",")})`}` }}
        />
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
            className="overflow-hidden"
          >
            <ul className="space-y-0.5 pb-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavList({ pathname, role, appEnabled, onNavigate }: { pathname: string; role: UserRole; appEnabled: boolean; onNavigate?: () => void }) {
  const groups = useMemo(() => {
    return NAV_GROUPS.map((g) => {
      // پایپ‌لاین/محتوای سایت are gated whole — a role blocked from one
      // item in either is blocked from all of them, so there's no per-item
      // check to run. سیستم has no group-level gate; each item decides for
      // itself via its own `visible`.
      if (g.id === "pipeline" && !canAccessPipeline(role)) return { ...g, items: [] };
      if (g.id === "content" && !canAccessContent(role)) return { ...g, items: [] };
      let items = g.items.filter((item) => (!item.app || appEnabled) && (!item.visible || item.visible(role)));
      if (g.id === "system" && isAdminRole(role)) items = [...items, ADMIN_NAV_ITEM];
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [role, appEnabled]);
  // Closed by default (defaultCollapsed), computed purely from pathname +
  // groups — no localStorage read here, so server and first client render
  // match exactly (a hydration mismatch is only a risk when the initial
  // value depends on something the server can't see). The effect below
  // swaps in an explicit stored preference right after mount, if one exists.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => defaultCollapsed(pathname, groups));

  // Re-syncs from storage on every navigation, then force-opens whichever
  // group holds the page just navigated to — a collapsed group has no
  // other way to reveal its active item (a direct link, a "view lead"
  // button elsewhere in the CRM), so arriving on one of its pages must
  // override a previously collapsed state for that group specifically.
  useEffect(() => {
    let cancelled = false;
    // Deferred a tick — a synchronous setState at the top of an effect
    // triggers React's cascading-render warning (react-hooks/set-state-in-effect);
    // this project's established fix elsewhere (see
    // EnergyConsumptionCalculator.tsx) is the same microtask defer.
    Promise.resolve().then(() => {
      if (cancelled) return;
      const stored = readStoredCollapsed() ?? defaultCollapsed(pathname, groups);
      const active = groupContaining(pathname, groups);
      if (active) stored.delete(active);
      setCollapsed(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, groups]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Private browsing / blocked storage — the toggle still works for this session, it just won't persist.
      }
      return next;
    });
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {PINNED_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-2">
        {groups.map((group) => (
          <NavGroupSection
            key={group.id}
            group={group}
            pathname={pathname}
            collapsed={collapsed.has(group.id)}
            onToggle={() => toggle(group.id)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function UserFooter({ userName, onNavigate }: { userName: string; onNavigate?: () => void }) {
  const initial = (userName || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">{initial}</span>
        <span className="truncate text-sm font-medium text-purple-900">{userName}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Link
          href="/fa"
          onClick={onNavigate}
          aria-label="بازگشت به سایت اصلی"
          className="press flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition-colors hover:border-purple-600 hover:text-purple-600"
        >
          <House size={16} />
        </Link>
        <button
          type="button"
          onClick={() => {
            track(EVENT.LOGOUT);
            signOut({ callbackUrl: "/fa" });
          }}
          className="press flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-body transition-colors hover:border-purple-600 hover:text-purple-600"
        >
          <SignOut size={14} />
          خروج
        </button>
      </div>
    </div>
  );
}

/**
 * Side navigation, not a top ribbon — deliberate change from the previous
 * horizontal bar. A dashboard/CRM tool is scanned and operated for long
 * stretches, not skimmed like a marketing page; a persistent side rail
 * keeps every section one click away without eating vertical space the
 * content itself needs (tables, forms). Farsi throughout, ordinary words
 * translated (مشتریان, امنیت) and CRM/tech loanwords kept in their
 * everyday Finglish form (لیدها, تیکت‌ها, تسک‌ها, آنالیتیکس) rather than
 * forced into a stiffer formal Persian — matching how these terms are
 * actually said in Persian business/tech contexts.
 */
export function OpsNav({ userName, notifications, role, appEnabled }: { userName: string; notifications: NotificationItem[]; role: UserRole; appEnabled: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-border bg-white lg:flex">
        <Link href="/ops" className="block px-5 pb-4 pt-5">
          <p className="text-lg font-bold text-purple-900">تعرفه</p>
          <p className="text-xs font-medium text-secondary">پنل عملیات</p>
        </Link>
        <nav className="flex-1 overflow-y-auto px-3">
          <NavList pathname={pathname} role={role} appEnabled={appEnabled} />
        </nav>
        <UserFooter userName={userName} />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="باز کردن منو"
          className="press flex h-9 w-9 items-center justify-center rounded-full border border-border text-purple-900"
        >
          <List size={18} />
        </button>
        <span className="text-sm font-bold text-purple-900">پنل عملیات</span>
        <NotificationBell initialNotifications={notifications} locale="fa" />
      </header>

      <div style={{ pointerEvents: mobileOpen ? "auto" : "none" }} className="contents">
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-purple-900/30 lg:hidden"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white lg:hidden"
                initial={reduce ? false : { x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="flex items-center justify-between px-5 pb-4 pt-5">
                  <div>
                    <p className="text-lg font-bold text-purple-900">تعرفه</p>
                    <p className="text-xs font-medium text-secondary">پنل عملیات</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    aria-label="بستن منو"
                    className="press flex h-9 w-9 items-center justify-center rounded-full border border-border"
                  >
                    <X size={18} />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto px-3">
                  <NavList pathname={pathname} role={role} appEnabled={appEnabled} onNavigate={() => setMobileOpen(false)} />
                </nav>
                <UserFooter userName={userName} onNavigate={() => setMobileOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
