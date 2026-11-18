"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { bulkLeadsAction, type BulkResult } from "@/lib/crm/crm-write-actions";

import { useOpsI18n } from "@/lib/ops-i18n/client";
/**
 * Open leads with checkboxes and one action bar for the selected ones: assign, set stage / follow-up, or close with a
 * reason (at most 50 at a time; each is written to the old CRM, failures are listed).
 */
export type BulkRow = {
  id: string;
  name: string;
  phone: string | null;
  meta: string;
  stage: string | null;
  owner: string | null;
  waiting: string | null;
  late: boolean;
  score: number;
  tier: string;
  tierTone: "hot" | "warm" | "cold";
  scoreReasons: string;
};
type Option = [number, string];

const field = "rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-xs text-body outline-none focus:border-purple-600";
const TIER_CLASS = { hot: "bg-danger-bg text-danger", warm: "bg-warning-bg text-warning", cold: "bg-tint text-secondary" };

export function BulkLeads({
  rows,
  users,
  stages,
  reasons,
  closeReasons,
  returnPath,
  canWrite,
  dry,
}: {
  rows: BulkRow[];
  users: { id: string; name: string }[];
  stages: Option[];
  reasons: Option[];
  closeReasons: Option[];
  returnPath: string;
  canWrite: boolean;
  dry?: boolean;
}) {
  const { t, intl } = useOpsI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState("assign");
  const [state, action, pending] = useActionState<BulkResult, FormData>(bulkLeadsAction, null);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < 50) n.add(id);
      return n;
    });
  const allShown = rows.slice(0, 50).map((r) => r.id);

  return (
    <div className="mt-3">
      {canWrite && (
        <form action={action} className="sticky top-0 z-10 mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-white p-3 shadow-card">
          <input type="hidden" name="returnPath" value={returnPath} />
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <span className="self-center text-xs font-semibold text-purple-900">{t("{n} انتخاب‌شده", { n: selected.size.toLocaleString(intl) })}</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t("کار گروهی")} className={field}>
            <option value="assign">{t("واگذاری")}</option>
            <option value="status">{t("تغییر مرحله / وضعیت")}</option>
            <option value="close">{t("بستن با دلیل")}</option>
          </select>
          {kind === "assign" && (
            <select name="userId" required defaultValue="" aria-label={t("به")} className={field}>
              <option value="" disabled>
                {t("به…")}
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          {kind === "status" && (
            <>
              <select name="stage" defaultValue="" aria-label={t("مرحله")} className={field}>
                <option value="">{t("مرحله: بدون تغییر")}</option>
                {stages.map(([v, l]) => (
                  <option key={v} value={v}>
                    {t(l)}
                  </option>
                ))}
              </select>
              <select name="reason" defaultValue="" aria-label={t("وضعیت پیگیری")} className={field}>
                <option value="">{t("وضعیت: بدون تغییر")}</option>
                {reasons.map(([v, l]) => (
                  <option key={v} value={v}>
                    {t(l)}
                  </option>
                ))}
              </select>
            </>
          )}
          {kind === "close" && (
            <>
              <select name="closeReason" required defaultValue="" aria-label={t("دلیل بستن")} className={field}>
                <option value="" disabled>
                  {t("دلیل بستن…")}
                </option>
                {closeReasons.map(([v, l]) => (
                  <option key={v} value={v}>
                    {t(l)}
                  </option>
                ))}
              </select>
              <input name="explanation" maxLength={500} placeholder={t("توضیح (اختیاری)")} className={field} />
            </>
          )}
          <button
            type="submit"
            disabled={pending || selected.size === 0}
            onClick={(e) => {
              if (kind === "close" && !confirm(t("{n} سرنخ در CRM قدیم بسته شوند؟", { n: selected.size }))) e.preventDefault();
            }}
            className="press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900 disabled:opacity-50"
          >
            {pending ? t("در حال انجام…") : t("اعمال روی انتخاب‌شده‌ها")}
          </button>
          {state && (
            <span role="status" className={`text-xs ${state.ok ? "text-success" : "text-danger"}`}>
              {state.message}
              {dry && state.ok ? t(" (آزمایشی — ارسال نشد)") : ""}
              {state.failed?.length ? ` — ${t("خطا:")} ${state.failed.slice(0, 3).join(t("، "))}` : ""}
            </span>
          )}
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              {canWrite && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label={t("انتخاب همه (تا ۵۰)")}
                    checked={allShown.length > 0 && allShown.every((id) => selected.has(id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(allShown) : new Set())}
                  />
                </th>
              )}
              <th className="px-3 py-3 text-start font-medium">{t("نام")}</th>
              <th className="px-3 py-3 text-start font-medium">{t("امتیاز")}</th>
              <th className="px-3 py-3 text-start font-medium">{t("منتظر")}</th>
              <th className="px-3 py-3 text-start font-medium">{t("مرحله")}</th>
              <th className="px-3 py-3 text-start font-medium">{t("مسئول")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-border last:border-0 ${selected.has(r.id) ? "bg-purple-600/5" : "hover:bg-tint/40"}`}>
                {canWrite && (
                  <td className="px-3 py-3">
                    <input type="checkbox" aria-label={t("انتخاب {name}", { name: r.name })} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                  </td>
                )}
                <td className="px-3 py-3">
                  <Link href={`/ops/leads/${r.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-xs text-secondary">
                    {r.meta}
                    {r.phone && (
                      <>
                        <span className="mx-1">·</span>
                        <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="font-latin hover:text-purple-600" dir="ltr">
                          {r.phone}
                        </a>
                      </>
                    )}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <span title={r.scoreReasons} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_CLASS[r.tierTone]}`}>
                    {t("{n}٪", { n: r.score.toLocaleString(intl) })} · {t(r.tier)}
                  </span>
                </td>
                <td className={`whitespace-nowrap px-3 py-3 text-xs ${r.late ? "font-semibold text-danger" : "text-secondary"}`}>{r.waiting ?? "—"}</td>
                <td className="px-3 py-3 text-xs text-secondary">{r.stage ?? "—"}</td>
                <td className="px-3 py-3 text-xs text-secondary">{r.owner ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
