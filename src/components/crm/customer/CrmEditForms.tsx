"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { assignCrmRecord, closeCrmLead, linkCrmLeads, scheduleCrmCall, updateCrmLead, uploadCrmFile, type WriteResult } from "@/lib/crm/crm-write-actions";

/**
 * Editing old-CRM records from /ops (lib/dynamics/write.ts): every change is written to Dynamics first and read
 * back, so the page shows Dynamics' answer. Each form reports what Dynamics said; `dry` = test mode (nothing sent).
 */

type Option = [number, string];
type User = { id: string; name: string };
type Common = { entity: string; id: string; returnPath: string; dry?: boolean };

const field = "w-full rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-sm text-body outline-none focus:border-purple-600";
const label = "text-xs font-medium text-secondary";
const primary = "press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900 disabled:opacity-50";

function Hidden({ entity, id, returnPath }: Common) {
  return (
    <>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnPath" value={returnPath} />
    </>
  );
}

function Result({ state, dry }: { state: WriteResult; dry?: boolean }) {
  if (!state) return null;
  return (
    <span role="status" className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>
      {state.ok && dry ? `${state.message} (آزمایشی — ارسال نشد)` : state.message}
    </span>
  );
}

/** Stage («مرحله») and follow-up reason («وضعیت») of an open lead. */
export function LeadStatusForm({ stages, reasons, stage, reason, ...common }: Common & { stages: Option[]; reasons: Option[]; stage: number | null; reason: number | null }) {
  const [state, action, pending] = useActionState<WriteResult, FormData>(updateCrmLead, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Hidden {...common} />
      <label className="min-w-40 flex-1">
        <span className={label}>مرحله</span>
        <select name="stage" defaultValue={stage ?? ""} className={`${field} mt-1`}>
          {stage === null && <option value="">—</option>}
          {stages.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-40 flex-1">
        <span className={label}>وضعیت پیگیری</span>
        <select name="reason" defaultValue={reason ?? ""} className={`${field} mt-1`}>
          {reason === null && <option value="">—</option>}
          {reasons.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "در حال ثبت…" : "ذخیره"}
      </button>
      <Result state={state} dry={common.dry} />
    </form>
  );
}

/** Closes an open lead with a reason; asks for a second click so it isn't closed by accident. */
export function CloseLeadForm({ reasons, ...common }: Common & { reasons: Option[] }) {
  const [state, action, pending] = useActionState<WriteResult, FormData>(closeCrmLead, null);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="press rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-bg">
        بستن سرنخ…
      </button>
    );
  return (
    <form action={action} className="space-y-2 rounded-xl border border-danger/30 bg-danger-bg/40 p-3">
      <Hidden {...common} />
      <label className="block">
        <span className={label}>دلیل بستن</span>
        <select name="reason" required defaultValue="" className={`${field} mt-1`}>
          <option value="" disabled>
            انتخاب کنید…
          </option>
          {reasons.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>توضیح (اختیاری)</span>
        <textarea name="explanation" rows={2} maxLength={2000} className={`${field} mt-1`} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="press rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "در حال بستن…" : "بستن سرنخ"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-secondary hover:text-body">
          انصراف
        </button>
        <Result state={state} dry={common.dry} />
      </div>
    </form>
  );
}

export function AssignForm({ users, ownerId, ...common }: Common & { users: User[]; ownerId: string | null }) {
  const [state, action, pending] = useActionState<WriteResult, FormData>(assignCrmRecord, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Hidden {...common} />
      <label className="min-w-48 flex-1">
        <span className={label}>مسئول</span>
        <select name="userId" defaultValue={ownerId ?? ""} required className={`${field} mt-1`}>
          {!ownerId && <option value="">—</option>}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "در حال ثبت…" : "واگذاری"}
      </button>
      <Result state={state} dry={common.dry} />
    </form>
  );
}

/** A follow-up phone call (Dynamics phone call activity) for an operator — shows in their «کارهای من». */
export function ScheduleCallForm({ users, defaultOwnerId, ...common }: Common & { users: User[]; defaultOwnerId: string | null }) {
  const [state, action, pending] = useActionState<WriteResult, FormData>(scheduleCrmCall, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form
      ref={form}
      action={action}
      // The chosen time is the operator's local time: the browser's offset goes with it.
      onSubmit={(e) => {
        const tz = e.currentTarget.elements.namedItem("tzOffset");
        if (tz instanceof HTMLInputElement) tz.value = String(new Date().getTimezoneOffset());
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <Hidden {...common} />
      <input type="hidden" name="tzOffset" defaultValue="0" />
      <label className="min-w-40 flex-[2]">
        <span className={label}>موضوع</span>
        <input name="subject" maxLength={200} placeholder="تماس پیگیری" className={`${field} mt-1`} />
      </label>
      <label className="min-w-44 flex-1">
        <span className={label}>زمان تماس</span>
        <input name="dueAt" type="datetime-local" required className={`${field} font-latin mt-1`} />
      </label>
      <label className="min-w-40 flex-1">
        <span className={label}>برای</span>
        <select name="ownerId" defaultValue={defaultOwnerId ?? ""} required className={`${field} mt-1`}>
          {!defaultOwnerId && <option value="">انتخاب کنید…</option>}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "در حال ثبت…" : "ثبت تماس"}
      </button>
      <Result state={state} dry={common.dry} />
    </form>
  );
}

/** Attaches a file (PDF or photo, up to 5 MB) as a note with a document in the old CRM. */
export function UploadFileForm(common: Common) {
  const [state, action, pending] = useActionState<WriteResult, FormData>(uploadCrmFile, null);
  const form = useRef<HTMLFormElement>(null);
  const [tooBig, setTooBig] = useState(false);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-wrap items-end gap-3">
      <Hidden {...common} />
      <label className="min-w-52 flex-1">
        <span className={label}>فایل (PDF یا عکس، تا ۵ مگابایت)</span>
        <input
          name="file"
          type="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          onChange={(e) => setTooBig((e.currentTarget.files?.[0]?.size ?? 0) > 5 * 1024 * 1024)}
          className="mt-1 block w-full text-xs text-body file:me-3 file:rounded-lg file:border-0 file:bg-tint file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-purple-900"
        />
      </label>
      <label className="min-w-40 flex-1">
        <span className={label}>توضیح (اختیاری)</span>
        <input name="note" maxLength={2000} className={`${field} mt-1`} />
      </label>
      <button type="submit" disabled={pending || tooBig} className={primary}>
        {pending ? "در حال بارگذاری…" : "بارگذاری"}
      </button>
      {tooBig ? <span className="text-xs text-danger">فایل بزرگ‌تر از ۵ مگابایت است.</span> : <Result state={state} dry={common.dry} />}
    </form>
  );
}

/** The two ways to link a found lead: it is a duplicate of this one, or this one is a duplicate of it. */
export function LeadLinkButtons({ currentId, otherId, returnPath, dry }: { currentId: string; otherId: string; returnPath: string; dry?: boolean }) {
  const [state, action, pending] = useActionState<WriteResult, FormData>(linkCrmLeads, null);
  if (state?.ok) return <Result state={state} dry={dry} />;
  const button = (duplicate: string, main: string, text: string, title: string) => (
    <form action={action}>
      <input type="hidden" name="duplicate" value={duplicate} />
      <input type="hidden" name="main" value={main} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button type="submit" disabled={pending} title={title} className="press rounded-lg border border-border-strong px-2.5 py-1 text-xs font-medium text-purple-900 hover:border-purple-600 disabled:opacity-50">
        {text}
      </button>
    </form>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {button(otherId, currentId, "تکراریِ همین سرنخ است", "آن سرنخ در CRM قدیم به‌عنوان تکراری بسته می‌شود؛ کار روی همین سرنخ ادامه پیدا می‌کند")}
      {button(currentId, otherId, "همین سرنخ تکراری است", "همین سرنخ در CRM قدیم به‌عنوان تکراری بسته می‌شود؛ کار روی آن سرنخ ادامه پیدا می‌کند")}
      <Result state={state} dry={dry} />
    </div>
  );
}
