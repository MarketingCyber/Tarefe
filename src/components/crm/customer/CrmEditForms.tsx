"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { assignCrmRecord, callResultAction, closeCrmLead, linkCrmLeads, qualifyLeadAction, scheduleCrmCall, updateCrmLead, uploadCrmFile, type QualifyResult, type WriteResult } from "@/lib/crm/crm-write-actions";

import { useOpsI18n } from "@/lib/ops-i18n/client";
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
  const { t } = useOpsI18n();
  if (!state) return null;
  return (
    <span role="status" className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>
      {state.ok && dry ? `${state.message} ${t("(آزمایشی — ارسال نشد)")}` : state.message}
    </span>
  );
}

/** Stage («مرحله») and follow-up reason («وضعیت») of an open lead. */
export function LeadStatusForm({ stages, reasons, stage, reason, ...common }: Common & { stages: Option[]; reasons: Option[]; stage: number | null; reason: number | null }) {
  const { t } = useOpsI18n();
  const [state, action, pending] = useActionState<WriteResult, FormData>(updateCrmLead, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Hidden {...common} />
      <label className="min-w-40 flex-1">
        <span className={label}>{t("مرحله")}</span>
        <select name="stage" defaultValue={stage ?? ""} className={`${field} mt-1`}>
          {stage === null && <option value="">—</option>}
          {stages.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-40 flex-1">
        <span className={label}>{t("وضعیت پیگیری")}</span>
        <select name="reason" defaultValue={reason ?? ""} className={`${field} mt-1`}>
          {reason === null && <option value="">—</option>}
          {reasons.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? t("در حال ثبت…") : t("ذخیره")}
      </button>
      <Result state={state} dry={common.dry} />
    </form>
  );
}

/** Closes an open lead with a reason; asks for a second click so it isn't closed by accident. */
export function CloseLeadForm({ reasons, ...common }: Common & { reasons: Option[] }) {
  const { t } = useOpsI18n();
  const [state, action, pending] = useActionState<WriteResult, FormData>(closeCrmLead, null);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="press rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-bg">
        {t("بستن سرنخ…")}
      </button>
    );
  return (
    <form action={action} className="space-y-2 rounded-xl border border-danger/30 bg-danger-bg/40 p-3">
      <Hidden {...common} />
      <label className="block">
        <span className={label}>{t("دلیل بستن")}</span>
        <select name="reason" required defaultValue="" className={`${field} mt-1`}>
          <option value="" disabled>
            {t("انتخاب کنید…")}
          </option>
          {reasons.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={label}>{t("توضیح (اختیاری)")}</span>
        <textarea name="explanation" rows={2} maxLength={2000} className={`${field} mt-1`} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="press rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? t("در حال بستن…") : t("بستن سرنخ")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-secondary hover:text-body">
          {t("انصراف")}
        </button>
        <Result state={state} dry={common.dry} />
      </div>
    </form>
  );
}

export function AssignForm({ users, ownerId, ...common }: Common & { users: User[]; ownerId: string | null }) {
  const { t } = useOpsI18n();
  const [state, action, pending] = useActionState<WriteResult, FormData>(assignCrmRecord, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Hidden {...common} />
      <label className="min-w-48 flex-1">
        <span className={label}>{t("مسئول")}</span>
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
        {pending ? t("در حال ثبت…") : t("واگذاری")}
      </button>
      <Result state={state} dry={common.dry} />
    </form>
  );
}

/** A follow-up phone call (Dynamics phone call activity) for an operator — shows in their «کارهای من». */
export function ScheduleCallForm({ users, defaultOwnerId, ...common }: Common & { users: User[]; defaultOwnerId: string | null }) {
  const { t } = useOpsI18n();
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
        <span className={label}>{t("موضوع")}</span>
        <input name="subject" maxLength={200} placeholder={t("تماس پیگیری")} className={`${field} mt-1`} />
      </label>
      <label className="min-w-44 flex-1">
        <span className={label}>{t("زمان تماس")}</span>
        <input name="dueAt" type="datetime-local" required className={`${field} font-latin mt-1`} />
      </label>
      <label className="min-w-40 flex-1">
        <span className={label}>{t("برای")}</span>
        <select name="ownerId" defaultValue={defaultOwnerId ?? ""} required className={`${field} mt-1`}>
          {!defaultOwnerId && <option value="">{t("انتخاب کنید…")}</option>}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? t("در حال ثبت…") : t("ثبت تماس")}
      </button>
      <Result state={state} dry={common.dry} />
    </form>
  );
}

/** Attaches a file (PDF or photo, up to 5 MB) as a note with a document in the old CRM. */
export function UploadFileForm(common: Common) {
  const { t } = useOpsI18n();
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
        <span className={label}>{t("فایل (PDF یا عکس، تا ۵ مگابایت)")}</span>
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
        <span className={label}>{t("توضیح (اختیاری)")}</span>
        <input name="note" maxLength={2000} className={`${field} mt-1`} />
      </label>
      <button type="submit" disabled={pending || tooBig} className={primary}>
        {pending ? t("در حال بارگذاری…") : t("بارگذاری")}
      </button>
      {tooBig ? <span className="text-xs text-danger">{t("فایل بزرگ‌تر از ۵ مگابایت است.")}</span> : <Result state={state} dry={common.dry} />}
    </form>
  );
}

/** The two ways to link a found lead: it is a duplicate of this one, or this one is a duplicate of it. */
export function LeadLinkButtons({ currentId, otherId, returnPath, dry }: { currentId: string; otherId: string; returnPath: string; dry?: boolean }) {
  const { t } = useOpsI18n();
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
      {button(otherId, currentId, t("تکراریِ همین سرنخ است"), t("آن سرنخ در CRM قدیم به‌عنوان تکراری بسته می‌شود؛ کار روی همین سرنخ ادامه پیدا می‌کند"))}
      {button(currentId, otherId, t("همین سرنخ تکراری است"), t("همین سرنخ در CRM قدیم به‌عنوان تکراری بسته می‌شود؛ کار روی آن سرنخ ادامه پیدا می‌کند"))}
      <Result state={state} dry={dry} />
    </div>
  );
}

type CallOption = [string, string];

/**
 * «نتیجه تماس»: one click after a call. For «بعداً تماس بگیریم» the time of the next call is required; a note is
 * optional. `callId`: completing a planned call (call list) instead of logging a new one.
 */
export function CallResultForm({ results, callId, compact, ...common }: Common & { results: CallOption[]; callId?: string; compact?: boolean }) {
  const { t } = useOpsI18n();
  const [state, action, pending] = useActionState<WriteResult, FormData>(callResultAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  if (compact && state?.ok) return <Result state={state} dry={common.dry} />;
  return (
    <form
      ref={form}
      action={action}
      onSubmit={(e) => {
        const tz = e.currentTarget.elements.namedItem("tzOffset");
        if (tz instanceof HTMLInputElement) tz.value = String(new Date().getTimezoneOffset());
      }}
      className="space-y-2"
    >
      <Hidden {...common} />
      {callId && <input type="hidden" name="callId" value={callId} />}
      <input type="hidden" name="tzOffset" defaultValue="0" />
      <div className="flex flex-wrap gap-2">
        <input name="note" maxLength={2000} placeholder={t("یادداشت تماس (اختیاری)")} aria-label={t("یادداشت تماس")} className={`${field} min-w-0 basis-56 flex-[2]`} />
        <label className="flex min-w-0 basis-56 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs text-secondary">{t("تماس بعدی")}</span>
          <input name="nextAt" type="datetime-local" aria-label={t("زمان تماس بعدی")} className={`${field} font-latin min-w-0 flex-1`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {results.map(([value, text]) => (
          <button
            key={value}
            type="submit"
            name="result"
            value={value}
            disabled={pending}
            className={`press rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
              value === "wrong_number" ? "border border-danger/40 text-danger hover:bg-danger-bg" : value === "interested" ? "bg-purple-600 text-white hover:bg-purple-900" : "border border-border-strong text-purple-900 hover:border-purple-600"
            }`}
          >
            {t(text)}
          </button>
        ))}
        {pending && <span className="text-xs text-secondary">{t("در حال ثبت…")}</span>}
        <Result state={state} dry={common.dry} />
      </div>
    </form>
  );
}

/** «تبدیل به قرارداد»: Dynamics' own Qualify after a confirmation; links to the new contract. */
export function QualifyLeadForm({ customerName, ...common }: Common & { customerName: string | null }) {
  const { t, tn } = useOpsI18n();
  const [state, action, pending] = useActionState<QualifyResult, FormData>(qualifyLeadAction, null);
  const [open, setOpen] = useState(false);
  if (state?.ok)
    return (
      <p role="status" className="text-sm text-success">
        {common.dry ? `${state.message} ${t("(آزمایشی — ارسال نشد)")}` : state.message}{" "}
        {state.href && (
          <a href={state.href} className="font-semibold underline">
            {t("رفتن به قرارداد")}
          </a>
        )}
      </p>
    );
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="press rounded-lg border border-success/40 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success-bg">
        {t("تبدیل به قرارداد…")}
      </button>
    );
  return (
    <form action={action} className="space-y-2 rounded-xl border border-success/30 bg-success-bg/50 p-3">
      <Hidden {...common} />
      <p className="text-sm text-body">
        {t("CRM قدیم با روش خودش («Qualify») قرارداد می‌سازد و اتوماسیون‌هایش را اجرا می‌کند —")}{" "}
        {customerName ? (
          <>
            {t("برای مشتری موجود")} <strong>{customerName === "مشتری لید" || customerName === "مشتری موجود" ? t(customerName) : customerName}</strong>.
          </>
        ) : (
          t("مشتری‌ای با این شماره یا ایمیل پیدا نشد، پس مشتری جدید هم ساخته می‌شود.")
        )}{" "}
        {t("بقیه‌ی جزئیات قرارداد را بعد در صفحه‌ی قرارداد تکمیل کنید.")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className="press rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? t("در حال تبدیل…") : t("تبدیل به قرارداد")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-secondary hover:text-body">
          {t("انصراف")}
        </button>
        {state && !state.ok && <span className="text-xs text-danger">{state.message}</span>}
      </div>
    </form>
  );
}
