"use client";

import { useActionState, useEffect, useRef } from "react";
import { Check } from "@phosphor-icons/react";
import { addCrmNote, closeCrmActivity, type WriteResult } from "@/lib/crm/crm-write-actions";

import { useOpsI18n } from "@/lib/ops-i18n/client";
/**
 * The old-CRM write-back controls (lib/dynamics/write.ts): close a task / call / appointment, add a note. They're
 * only rendered when CRM_WRITES isn't off; each shows Dynamics' answer, so an operator knows whether it took.
 * `dry` marks the test mode, in which nothing is sent to Dynamics.
 */

export function CloseActivityButton({ entity, id, returnPath, dry }: { entity: string; id: string; returnPath: string; dry?: boolean }) {
  const { t } = useOpsI18n();
  const [state, action, pending] = useActionState<WriteResult, FormData>(closeCrmActivity, null);
  if (state?.ok) return <span className="text-xs font-medium text-success">{dry ? t("بسته شد (آزمایشی)") : state.message}</span>;
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button
        type="submit"
        disabled={pending}
        title={t("در CRM قدیم «انجام‌شده» می‌شود")}
        className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium text-purple-900 hover:border-purple-600 disabled:opacity-50"
      >
        <Check size={12} weight="bold" />
        {pending ? t("در حال ثبت…") : t("انجام شد")}
      </button>
      {state && !state.ok && <span className="text-xs text-danger">{state.message}</span>}
    </form>
  );
}

export function AddNoteForm({ entity, id, returnPath, dry, anchor }: { entity: string; id: string; returnPath: string; dry?: boolean; anchor?: string }) {
  const { t } = useOpsI18n();
  const [state, action, pending] = useActionState<WriteResult, FormData>(addCrmNote, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} id={anchor} action={action} className="scroll-mt-6 rounded-xl border border-border-strong bg-tint/60 p-3">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <label htmlFor={`note-${id}`} className="text-xs font-medium text-secondary">
        {t("یادداشت جدید در CRM قدیم")}{dry ? t(" (آزمایشی — ارسال نمی‌شود)") : ""}
      </label>
      <textarea
        id={`note-${id}`}
        name="text"
        required
        maxLength={5000}
        rows={3}
        placeholder={t("یادداشت را این‌جا بنویسید…")}
        className="mt-1.5 w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-body outline-none focus:border-purple-600"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900 disabled:opacity-50">
          {pending ? t("در حال ثبت…") : t("ثبت یادداشت")}
        </button>
        {state && <span className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>{state.ok && dry ? t("ثبت شد (آزمایشی)") : state.message}</span>}
      </div>
    </form>
  );
}
