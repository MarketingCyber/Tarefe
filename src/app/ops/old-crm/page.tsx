import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { CRM_TABLES } from "@/lib/dynamics/sync";
import { TABLE_LABELS } from "@/lib/dynamics/view";
import { attachmentCounts } from "@/lib/dynamics/files";

import { getOpsI18n } from "@/lib/ops-i18n/server";
/**
 * Old CRM (Dynamics 365) — read-only mirror, phase 1 of docs/crm-redesign/04-migration-plan.md. Every table with
 * how many records are copied and when the sync last ran, so operators and QA can see the copy is complete, plus the
 * latest nightly reconciliation (crm_checks: Dynamics' count vs. the mirror's, and a field-by-field sample).
 */
export const dynamic = "force-dynamic";


export default async function OldCrmPage() {
  const { t, intl } = await getOpsI18n();
  const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat(intl, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(d) : "—");
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const [counts, states, checks, files] = await Promise.all([
    prisma.crmRecord.groupBy({ by: ["entity"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.crmSyncState.findMany(),
    prisma.crmCheck.findMany({ distinct: ["entity"], orderBy: [{ entity: "asc" }, { ranAt: "desc" }] }),
    attachmentCounts(),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.entity, c._count._all]));
  const state = Object.fromEntries(states.map((s) => [s.entity, s]));
  const check = Object.fromEntries(checks.map((c) => [c.entity, c]));
  const checkedOk = checks.filter((c) => !c.error && c.live === c.mirror && c.mismatched === 0).length;
  const lastCheck = checks.reduce<Date | null>((d, c) => (!d || c.ranAt > d ? c.ranAt : d), null);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">{t("CRM قدیم (Dynamics)")}</h1>
      <p className="mt-1 text-sm text-secondary">{t("کپی زنده و فقط‌خواندنی از همه جدول‌های CRM قدیم، با همه فیلدها و همان برچسب‌ها. تغییرات هر چند دقیقه همگام می‌شوند.")}</p>

      {lastCheck && (
        <p className="mt-4 text-sm text-secondary">
          {t("آخرین بررسی تطبیق با CRM قدیم: {date} — {ok} جدول از {all} بدون اختلاف", { date: fmt(lastCheck), ok: checkedOk.toLocaleString(intl), all: checks.length.toLocaleString(intl) })}
        </p>
      )}

      <p className="mt-2 text-sm">
        <Link href="/ops/old-crm/automations" className="font-medium text-purple-600 hover:underline">
          {t("اتوماسیون‌ها در حالت آزمایشی ←")}
        </Link>
      </p>
      <p className="mt-2 text-sm text-secondary">
        {t("فایل‌های پیوست یادداشت‌ها: {done} از {all} کپی شده", { done: files.copied.toLocaleString(intl), all: files.expected.toLocaleString(intl) })}
        {files.copied < files.expected ? t(" — کپی ادامه دارد") : ""}
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="px-4 py-3 text-start font-medium">{t("جدول")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("رکوردها")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("آخرین همگام‌سازی موفق")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("وضعیت")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("بررسی تطبیق")}</th>
            </tr>
          </thead>
          <tbody>
            {CRM_TABLES.map((tb) => {
              const s = state[tb.name];
              const status = !s ? t("هنوز شروع نشده") : s.lastError ? `${t("خطا:")} ${s.lastError.slice(0, 80)}` : s.nextLink ? t("در حال کپی…") : t("به‌روز");
              return (
                <tr key={tb.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/ops/old-crm/${tb.name}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {t(TABLE_LABELS[tb.name] ?? tb.name)}
                    </Link>
                    <span className="font-latin ms-2 text-xs text-secondary">{tb.name}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{(count[tb.name] ?? 0).toLocaleString(intl)}</td>
                  <td className="px-4 py-3 text-secondary">{fmt(s?.lastSuccessAt ?? null)}</td>
                  <td className={`px-4 py-3 text-xs ${s?.lastError ? "text-red-700" : "text-secondary"}`}>{status}</td>
                  <CheckCell entity={tb.name} check={check[tb.name]} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Check = { live: number | null; mirror: number; sampled: number; mismatched: number; details: unknown; error: string | null };

async function CheckCell({ entity, check }: { entity: string; check?: Check }) {
  const { t, intl } = await getOpsI18n();
  if (!check) return <td className="px-4 py-3 text-xs text-secondary">—</td>;
  if (check.error) return <td className="px-4 py-3 text-xs text-red-700">{t("بررسی نشد:")} {check.error.slice(0, 60)}</td>;
  const countOk = check.live === check.mirror;
  const bad = (check.details as { crmId: string; fields: string[] }[] | null) ?? [];
  return (
    <td className={`px-4 py-3 text-xs ${countOk && !bad.length ? "text-green-700" : "text-amber-700"}`}>
      {countOk ? t("تعداد یکسان") : t("در CRM قدیم {n}", { n: (check.live ?? 0).toLocaleString(intl) })}
      {" · "}
      {check.sampled ? t("{same} از {all} نمونه یکسان", { same: (check.sampled - bad.length).toLocaleString(intl), all: check.sampled.toLocaleString(intl) }) : t("بدون نمونه")}
      {bad.slice(0, 3).map((b) => (
        <Link key={b.crmId} href={`/ops/old-crm/${entity}/${b.crmId}`} className="font-latin mt-1 block text-amber-800 hover:underline" title={b.fields.join(", ")}>
          {b.fields.slice(0, 3).join(", ")}
        </Link>
      ))}
    </td>
  );
}
