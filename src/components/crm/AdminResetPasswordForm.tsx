"use client";

import { useState, type FormEvent } from "react";
import { resetStaffPassword } from "@/lib/team-actions";

/**
 * Needs a real password input, not just hidden fields — the one action on
 * /ops/team that doesn't fit ConfirmDeleteForm's shape. Collapsed by
 * default so the table doesn't show 12 password inputs at once; expands
 * inline on click rather than a modal, matching this page's otherwise
 * plain, no-modal style.
 */
export function AdminResetPasswordForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="press text-xs font-medium text-secondary hover:text-purple-600">
        تغییر رمز عبور
      </button>
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const form = new FormData(e.currentTarget);
    // Client-side is enough here (an admin typing a temp password for
    // someone else, with immediate feedback) — resetStaffPassword also
    // re-checks server-side (team-actions.ts) since this form isn't the
    // only way to reach that action.
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      e.preventDefault();
      setMismatch(true);
      return;
    }
    setOpen(false);
  }

  return (
    <form action={resetStaffPassword} onSubmit={handleSubmit} className="grid gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex items-center gap-1.5">
        {/* No font-latin — Farsi placeholder, same reasoning as ops/team's own fields (found 2026-08-31). */}
        <input
          type="password"
          name="newPassword"
          placeholder="رمز عبور جدید"
          required
          minLength={8}
          autoFocus
          onChange={() => setMismatch(false)}
          className="w-28 rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-xs text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="تکرار رمز عبور"
          required
          minLength={8}
          onChange={() => setMismatch(false)}
          className="w-28 rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-xs text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
        <button type="submit" className="press rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">
          ثبت
        </button>
        <button type="button" onClick={() => setOpen(false)} className="press text-xs text-secondary hover:text-purple-600">
          لغو
        </button>
      </div>
      {mismatch && <p className="text-[11px] font-medium text-danger">رمز عبور و تکرار آن یکسان نیستند.</p>}
    </form>
  );
}
