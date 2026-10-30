import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { CRM_TABLES } from "@/lib/dynamics/sync";
import { TABLE_LABELS } from "@/lib/dynamics/view";

/**
 * Old CRM (Dynamics 365) — read-only mirror, phase 1 of docs/crm-redesign/04-migration-plan.md. Every table with
 * how many records are copied and when the sync last ran, so operators and QA can see the copy is complete.
 */
export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(d) : "—");

export default async function OldCrmPage() {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const [counts, states] = await Promise.all([
    prisma.crmRecord.groupBy({ by: ["entity"], where: { deletedAt: null }, _count: { _all: true } }),
    prisma.crmSyncState.findMany(),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.entity, c._count._all]));
  const state = Object.fromEntries(states.map((s) => [s.entity, s]));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">CRM قدیم (Dynamics)</h1>
      <p className="mt-1 text-sm text-secondary">کپی زنده و فقط‌خواندنی از همه جدول‌های CRM قدیم، با همه فیلدها و همان برچسب‌ها. تغییرات هر چند دقیقه همگام می‌شوند.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="px-4 py-3 text-start font-medium">جدول</th>
              <th className="px-4 py-3 text-start font-medium">رکوردها</th>
              <th className="px-4 py-3 text-start font-medium">آخرین همگام‌سازی موفق</th>
              <th className="px-4 py-3 text-start font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {CRM_TABLES.map((t) => {
              const s = state[t.name];
              const status = !s ? "هنوز شروع نشده" : s.lastError ? `خطا: ${s.lastError.slice(0, 80)}` : s.nextLink ? "در حال کپی…" : "به‌روز";
              return (
                <tr key={t.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/ops/old-crm/${t.name}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {TABLE_LABELS[t.name] ?? t.name}
                    </Link>
                    <span className="font-latin ms-2 text-xs text-secondary">{t.name}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{(count[t.name] ?? 0).toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3 text-secondary">{fmt(s?.lastSuccessAt ?? null)}</td>
                  <td className={`px-4 py-3 text-xs ${s?.lastError ? "text-red-700" : "text-secondary"}`}>{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
