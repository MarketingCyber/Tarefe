"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Bug, X } from "@phosphor-icons/react";
import { reportProblem, type QcResult } from "@/lib/crm/qc-actions";

/**
 * «گزارش مشکل» on every CRM page (QC during the parallel run): a small button in the corner opens a note box; the
 * report keeps the page it came from and who sent it, and lands on /ops/qc.
 */
export function ReportProblemButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<QcResult, FormData>(reportProblem, null);
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const box = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <div className="fixed bottom-4 left-4 z-40 print:hidden">
      {open ? (
        <div role="dialog" aria-labelledby="qc-title" className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-4 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 id="qc-title" className="text-sm font-bold text-purple-900">
              گزارش مشکل
            </h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="بستن" className="press rounded-full p-1.5 text-secondary hover:bg-tint hover:text-body">
              <X size={16} />
            </button>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-secondary">چه چیزی درست کار نمی‌کند یا با CRM قدیم فرق دارد؟ این صفحه و نام شما همراه گزارش ذخیره می‌شود.</p>
          <form ref={form} action={action} className="mt-3 space-y-2">
            <input type="hidden" name="path" value={query ? `${pathname}?${query}` : pathname} />
            <textarea
              ref={box}
              name="note"
              required
              rows={4}
              maxLength={4000}
              aria-label="شرح مشکل"
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              className="w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-body outline-none focus:border-purple-600"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={pending} className="press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900 disabled:opacity-50">
                {pending ? "در حال ثبت…" : "ثبت گزارش"}
              </button>
              {state && (
                <span role="status" className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>
                  {state.message}
                </span>
              )}
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="press inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-strong bg-white px-3.5 py-2 text-xs font-semibold text-purple-900 shadow-card hover:border-purple-600"
        >
          <Bug size={16} />
          گزارش مشکل
        </button>
      )}
    </div>
  );
}
