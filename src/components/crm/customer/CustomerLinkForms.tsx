"use client";

import { useActionState } from "react";
import { LinkSimple, LinkBreak } from "@phosphor-icons/react";
import { linkCustomerAction, unlinkCustomerAction, type LinkResult } from "@/lib/crm/customer-link-actions";

/**
 * The link between a website / app account and its old-CRM customer, on the Customer 360 page: how it was made,
 * unlink (a wrong automatic match), or link by customer number «شماره مشتری» (or the CRM id).
 */

const METHOD: Record<string, string> = { email: "خودکار، با ایمیل", phone: "خودکار، با شماره تلفن", staff: "توسط کارکنان" };

export function CustomerLinkStatus({ accountId, method, returnPath }: { accountId: string; method: string | null; returnPath: string }) {
  const [state, action, pending] = useActionState<LinkResult, FormData>(unlinkCustomerAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-xs text-secondary">
      <LinkSimple size={14} className="text-success" aria-hidden />
      <span>حساب سایت / اپ به این مشتری CRM وصل است ({METHOD[method ?? ""] ?? "—"}) — قراردادها و تیکت‌هایش در پنل مشتری و اپ دیده می‌شوند.</span>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <button type="submit" disabled={pending} className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 font-medium text-purple-900 hover:border-danger hover:text-danger disabled:opacity-50">
        <LinkBreak size={12} /> {pending ? "…" : "جدا کردن"}
      </button>
      {state && <span className={state.ok ? "text-success" : "text-danger"}>{state.message}</span>}
    </form>
  );
}

export function CustomerLinkForm({ accountId, suggested, returnPath }: { accountId: string; suggested?: string | null; returnPath: string }) {
  const [state, action, pending] = useActionState<LinkResult, FormData>(linkCustomerAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-xs text-secondary">
      <LinkBreak size={14} className="text-warning" aria-hidden />
      <span>{suggested ? "این حساب هنوز به مشتری CRM وصل نشده (فقط با ایمیل / تلفن پیدا شد)." : "این حساب به هیچ مشتری‌ای در CRM قدیم وصل نیست."}</span>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="returnPath" value={returnPath} />
      {suggested ? (
        <input type="hidden" name="contact" value={suggested} />
      ) : (
        <input name="contact" placeholder="شماره مشتری، مثلاً 02399" aria-label="شماره مشتری در CRM قدیم" className="font-latin w-44 rounded-full border border-border-strong bg-white px-3 py-1 text-xs text-body outline-none focus:border-purple-600" />
      )}
      <button type="submit" disabled={pending} className="press inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 font-semibold text-white hover:bg-purple-900 disabled:opacity-50">
        <LinkSimple size={12} /> {pending ? "…" : "وصل کردن"}
      </button>
      {state && <span className={state.ok ? "text-success" : "text-danger"}>{state.message}</span>}
    </form>
  );
}
