import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/permissions";
import { Badge } from "@/components/shared/Badge";
import { resolveProblem } from "@/lib/crm/qc-actions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
/**
 * «گزارش‌های مشکل»: what operators reported with the «گزارش مشکل» button during the parallel run (QC). Open ones
 * first; each shows the page it came from, who sent it and when; staff mark it fixed / not a bug with an answer.
 */
export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "neutral" }> = {
  open: { label: "باز", tone: "warning" },
  fixed: { label: "رفع شد", tone: "success" },
  not_a_bug: { label: "مشکل نبود", tone: "neutral" },
};

export default async function QcPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { t, intl, tn } = await getOpsI18n();
  const when = (d: Date) => d.toLocaleString(intl, { calendar: "gregory", dateStyle: "short", timeStyle: "short" });
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/qc");
  if (!isStaffRole(session.user.role)) redirect("/ops");
  const showAll = (await searchParams).show === "all";

  const reports = await prisma.qcReport.findMany({
    where: showAll ? {} : { status: "open" },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
  const [openCount, allCount] = await Promise.all([prisma.qcReport.count({ where: { status: "open" } }), prisma.qcReport.count()]);
  const people = new Map(
    (await prisma.user.findMany({ where: { id: { in: [...new Set(reports.map((r) => r.createdById))] } }, select: { id: true, name: true, email: true } })).map((u) => [u.id, u.name || u.email]),
  );

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">{t("گزارش‌های مشکل")}</h1>
      <p className="mt-1 max-w-[75ch] text-sm leading-relaxed text-secondary">
        {t("هرچه همکاران با دکمه «گزارش مشکل» از صفحه‌های CRM فرستاده‌اند — برای کنترل کیفیت در دوره‌ای که CRM جدید و قدیم کنار هم کار می‌کنند.")}
      </p>

      <div className="mt-5 flex gap-2 text-xs">
        <Link href="/ops/qc" className={`press rounded-full px-3 py-1.5 font-semibold ${showAll ? "border border-border-strong text-body" : "bg-purple-600 text-white"}`}>
          {t("باز ({n})", { n: openCount.toLocaleString(intl) })}
        </Link>
        <Link href="/ops/qc?show=all" className={`press rounded-full px-3 py-1.5 font-semibold ${showAll ? "bg-purple-600 text-white" : "border border-border-strong text-body"}`}>
          {t("همه ({n})", { n: allCount.toLocaleString(intl) })}
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-tint py-14 text-center">
          <p className="text-sm font-medium text-purple-900">{showAll ? t("هنوز گزارشی ثبت نشده") : t("گزارش بازی نیست")}</p>
          <p className="mx-auto mt-1 max-w-[50ch] text-xs text-secondary">{t("دکمه «گزارش مشکل» گوشه‌ی پایین هر صفحه‌ی CRM است.")}</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                  <Badge tone={STATUS[r.status]?.tone ?? "neutral"}>{tn(STATUS[r.status]?.label) ?? r.status}</Badge>
                  <span>{people.get(r.createdById) ?? "—"}</span>
                  <span>·</span>
                  <span>{when(r.createdAt)}</span>
                </div>
                <Link href={r.path} className="font-latin max-w-full truncate text-xs text-purple-600 hover:underline" dir="ltr">
                  {r.path}
                </Link>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body [overflow-wrap:anywhere]">{r.note}</p>
              {r.answer && (
                <p className="mt-3 rounded-xl bg-tint px-3 py-2 text-sm text-body">
                  <span className="font-medium">{t("پاسخ:")} </span>
                  {r.answer}
                </p>
              )}
              <form action={resolveProblem} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={r.id} />
                <label className="min-w-56 flex-1">
                  <span className="text-xs font-medium text-secondary">{t("پاسخ / کاری که انجام شد")}</span>
                  <input
                    name="answer"
                    defaultValue={r.answer ?? ""}
                    maxLength={2000}
                    className="mt-1 w-full rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-sm text-body outline-none focus:border-purple-600"
                  />
                </label>
                {r.status === "open" ? (
                  <>
                    <button name="status" value="fixed" className="press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">
                      {t("رفع شد")}
                    </button>
                    <button name="status" value="not_a_bug" className="press rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-body hover:border-purple-600">
                      {t("مشکل نبود")}
                    </button>
                  </>
                ) : (
                  <button name="status" value="open" className="press rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-body hover:border-purple-600">
                    {t("باز کردن دوباره")}
                  </button>
                )}
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
