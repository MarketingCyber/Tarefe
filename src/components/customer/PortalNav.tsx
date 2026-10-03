"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { track, EVENT } from "@/lib/analytics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  SignOut,
  House,
  Briefcase,
  ArrowLeft,
  List,
  X,
  SquaresFour,
  FileText,
  ClipboardText,
  Folder,
  Headset,
  UserCircle,
  type Icon,
} from "@phosphor-icons/react";
import { NotificationBell, type NotificationItem } from "@/components/shared/NotificationBell";

const NAV_ITEMS: { href: string; label: string; icon: Icon }[] = [
  { href: "/app", label: "داشبورد", icon: SquaresFour },
  { href: "/app/contracts", label: "قراردادها", icon: FileText },
  { href: "/app/applications", label: "درخواست‌ها", icon: ClipboardText },
  { href: "/app/documents", label: "مدارک", icon: Folder },
  { href: "/app/support", label: "پشتیبانی", icon: Headset },
  { href: "/app/profile", label: "پروفایل", icon: UserCircle },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/app" && pathname.startsWith(`${href}/`));
}

/**
 * A small icon in the footer wasn't enough — a first-time advisor/admin
 * landing on their own customer-facing portal had no reason to guess that
 * an unlabeled briefcase button was their way back to Ops. Placed right
 * under the brand, above the customer nav, so it's the first thing
 * scanned rather than something to notice at the bottom after everything
 * else — and it's a real labeled control ("go to the operations panel"),
 * not an icon a new user has to decode.
 */
function StaffOpsCallout({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="px-3 pb-3">
      <Link
        href="/ops"
        onClick={onNavigate}
        className="press flex items-center gap-2.5 rounded-xl border border-purple-600/25 bg-purple-600/5 px-3 py-2.5 text-sm font-semibold text-purple-600 transition-colors hover:border-purple-600 hover:bg-purple-600/10"
      >
        <Briefcase size={18} weight="fill" />
        <span className="flex-1">رفتن به پنل عملیات</span>
        <ArrowLeft size={14} weight="bold" />
      </Link>
    </div>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
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
          </li>
        );
      })}
    </ul>
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
 * Side navigation for the customer portal, not a top ribbon — the same
 * change made to `/ops`'s `OpsNav.tsx`, applied here for consistency (both
 * are internal, long-session tools, not marketing pages skimmed once).
 * `isStaff` (ADVISOR/ADMIN) surfaces a direct link to /ops — `/app` has no
 * role gate (see `src/app/app/layout.tsx`), so staff browsing their own
 * portal need a way back without knowing the URL by heart. Customers never
 * see it.
 */
export function PortalNav({ userName, notifications, isStaff = false }: { userName: string; notifications: NotificationItem[]; isStaff?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-border bg-white lg:flex">
        <Link href="/app" className="block px-5 pb-4 pt-5">
          <p className="text-lg font-bold text-purple-900">تعرفه من</p>
          <p className="text-xs font-medium text-secondary">پنل مشتری</p>
        </Link>
        {isStaff && <StaffOpsCallout />}
        <nav className="flex-1 overflow-y-auto px-3">
          <NavList pathname={pathname} />
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
        <span className="text-sm font-bold text-purple-900">تعرفه من</span>
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
                    <p className="text-lg font-bold text-purple-900">تعرفه من</p>
                    <p className="text-xs font-medium text-secondary">پنل مشتری</p>
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
                {isStaff && <StaffOpsCallout onNavigate={() => setMobileOpen(false)} />}
                <nav className="flex-1 overflow-y-auto px-3">
                  <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
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
