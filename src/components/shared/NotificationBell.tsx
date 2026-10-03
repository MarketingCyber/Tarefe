"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell } from "@phosphor-icons/react";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notification-actions";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

const LABELS: Record<"en" | "fa", { empty: string; markAll: string; title: string }> = {
  en: { empty: "No notifications yet.", markAll: "Mark all read", title: "Notifications" },
  fa: { empty: "هنوز اعلانی وجود ندارد.", markAll: "علامت‌گذاری همه به‌عنوان خوانده‌شده", title: "اعلان‌ها" },
};

export function NotificationBell({ initialNotifications, locale = "en" }: { initialNotifications: NotificationItem[]; locale?: "en" | "fa" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initialNotifications);
  const [, startTransition] = useTransition();
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const unreadCount = items.filter((n) => !n.read).length;
  const t = LABELS[locale];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    startTransition(() => markNotificationRead(id, pathname));
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(() => markAllNotificationsRead(pathname));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.title}
        className="press relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-body transition-colors hover:border-purple-600 hover:text-purple-600"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="font-latin absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* pointer-events tied directly to `open`, not animation completion —
          same defensive pattern as every other dropdown/overlay in this
          codebase (AccountMenu, MobileNav). */}
      <div style={{ pointerEvents: open ? "auto" : "none" }} className="contents">
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <motion.div
                role="dialog"
                aria-label={t.title}
                initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute end-0 top-full z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-white shadow-card-hover"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-bold text-purple-900">{t.title}</p>
                  {unreadCount > 0 && (
                    <button type="button" onClick={handleMarkAll} className="text-xs font-medium text-purple-600 hover:text-purple-900">
                      {t.markAll}
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-secondary">{t.empty}</p>
                  ) : (
                    items.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className={`flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-start last:border-0 transition-colors hover:bg-tint ${n.read ? "" : "bg-purple-600/5"}`}
                      >
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" />}
                        <div className={`min-w-0 flex-1 ${n.read ? "ps-4" : ""}`}>
                          <p className="text-xs font-semibold text-purple-900">{n.title}</p>
                          <p className="mt-0.5 text-xs text-secondary">{n.body}</p>
                          {/* Always en-GB, never locale === "fa" ? "fa-IR" : ... — toLocaleString("fa-IR")
                              renders Persian digit glyphs, which font-latin (Inter) has none of, causing
                              a silent font fallback for just those characters (see the identical bug
                              fixed in EnergyConsumptionCalculator.tsx, 2026-09-26). */}
                          <p className="font-latin mt-1 text-[10px] text-secondary">{n.createdAt.toLocaleString("en-GB")}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
