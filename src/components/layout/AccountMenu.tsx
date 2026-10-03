"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { track, EVENT } from "@/lib/analytics";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SquaresFour, Briefcase, SignOut } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { isStaffRole } from "@/lib/permissions";

/**
 * Replaces the public navbar's plain "Login" link once someone's actually
 * signed in — a name/email-carrying avatar that opens onto the portal (and
 * Ops, for staff), matching the interaction shape NotificationBell already
 * established (origin-aware popover, Escape + backdrop to close,
 * pointer-events tied to `open` rather than animation completion).
 *
 * Deliberately client-only, not server-rendered from a session prop: the
 * public site is ~500 statically-generated pages sharing this root layout,
 * and reading `auth()` up there to avoid a loading flash would force every
 * one of them dynamic. `useSession()`'s brief "loading" skeleton on first
 * paint is the honest, low-cost trade-off for keeping that static.
 */
export function AccountMenu({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (status === "loading") {
    return <div className="hidden h-9 w-9 shrink-0 animate-pulse rounded-full bg-tint lg:block" aria-hidden />;
  }

  // No public sign-in entry point — /login itself still works for staff who
  // navigate there directly, but nothing on the public site links to it.
  // Customers reach their contracts through the qualification/consultation
  // flow, not by logging into an account.
  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const user = session.user;
  const isStaff = isStaffRole(user.role);
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={dict.nav.myAccount}
        className="press flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white transition-colors hover:bg-purple-900"
      >
        {initial}
      </button>

      <div style={{ pointerEvents: open ? "auto" : "none" }} className="contents">
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <motion.div
                role="menu"
                aria-label={dict.nav.myAccount}
                initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute end-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-card-hover"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-bold text-purple-900">{user.name ?? user.email}</p>
                  {user.email && <p className="font-latin truncate text-xs text-secondary">{user.email}</p>}
                </div>
                <div className="p-1.5">
                  <Link
                    href="/app"
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-tint"
                  >
                    <SquaresFour size={16} />
                    {dict.nav.myAccount}
                  </Link>
                  {isStaff && (
                    <Link
                      href="/ops"
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-tint"
                    >
                      <Briefcase size={16} />
                      {dict.nav.goToOps}
                    </Link>
                  )}
                </div>
                <div className="border-t border-border p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      track(EVENT.LOGOUT, { locale });
                      signOut({ callbackUrl: `/${locale}` });
                    }}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm font-medium text-danger transition-colors hover:bg-danger-bg"
                  >
                    <SignOut size={16} />
                    {dict.nav.signOut}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
