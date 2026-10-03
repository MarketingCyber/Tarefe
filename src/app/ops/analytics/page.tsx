import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EVENT } from "@/lib/analytics";
import { canAccessAnalytics } from "@/lib/permissions";

const DAYS = 30;

const EVENT_LABEL: Record<string, string> = {
  page_view: "بازدید صفحه",
  search: "جستجوها",
  comparison_started: "مقایسه‌های شروع‌شده",
  qualification_started: "ویزاردهای صلاحیت‌سنجی شروع‌شده",
  qualification_completed: "ویزاردهای صلاحیت‌سنجی تکمیل‌شده",
  consultation_form_started: "فرم‌های مشاوره شروع‌شده",
  consultation_submitted: "مشاوره‌های ارسال‌شده",
  whatsapp_clicked: "کلیک‌های واتساپ",
  phone_clicked: "کلیک‌های تماس تلفنی",
  signup: "ثبت‌نام‌ها",
  login: "ورودها",
  logout: "خروج‌ها",
  web_vital: "نمونه‌های وب وایتالز",
  mfa_enabled: "فعال‌سازی احراز هویت دومرحله‌ای",
  mfa_disabled: "غیرفعال‌سازی احراز هویت دومرحله‌ای",
  lead_status_changed: "تغییر وضعیت سرنخ",
  application_created: "درخواست‌های ثبت‌شده",
  application_approved: "درخواست‌های تاییدشده",
  contract_created: "قراردادهای ایجادشده",
  contract_cancelled: "قراردادهای لغوشده",
  ticket_created: "تیکت‌های ثبت‌شده",
  document_uploaded: "مدارک بارگذاری‌شده",
};

const VITAL_LABEL: Record<string, string> = { LCP: "Largest Contentful Paint", CLS: "Cumulative Layout Shift", INP: "Interaction to Next Paint", FCP: "First Contentful Paint", TTFB: "Time to First Byte" };
const VITAL_ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB"];

function formatVitalValue(name: string, value: number): string {
  if (name === "CLS") return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

/** Percentile of a pre-sorted array — p75 is the standard Core Web Vitals reporting percentile (matches Chrome UX Report / Lighthouse convention). */
function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.floor(p * sortedValues.length));
  return sortedValues[index];
}

/**
 * Real counts from AnalyticsEvent — no placeholder charts, no invented
 * trend lines. A brand-new deployment will legitimately show mostly zeros
 * until real visitors generate events; that's the honest state, not a
 * bug to paper over with fake data.
 */
export default async function AnalyticsPage() {
  const session = await auth();
  if (!canAccessAnalytics(session?.user?.role)) redirect("/ops");

  const since = new Date(new Date().getTime() - DAYS * 24 * 60 * 60 * 1000);

  const [byName, topPaths, totalSessions, webVitalEvents] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["name"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since }, name: EVENT.PAGE_VIEW, path: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since } }, distinct: ["sessionId"], select: { sessionId: true } }),
    // Core Web Vitals (Phase 12.3) — p75 computed here rather than via SQL
    // aggregation: the current data volume is small enough (first-party,
    // consent-gated, one niche site) that pulling matching rows into Node
    // is simpler and more portable than a raw percentile_cont query, and
    // metadata is a Json field Prisma can't aggregate over directly anyway.
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since }, name: EVENT.WEB_VITAL }, select: { metadata: true } }),
  ]);

  const vitalsByMetric: Record<string, { value: number; rating: string }[]> = {};
  for (const event of webVitalEvents) {
    const meta = event.metadata as { name?: string; value?: number; rating?: string } | null;
    if (!meta?.name || typeof meta.value !== "number") continue;
    (vitalsByMetric[meta.name] ??= []).push({ value: meta.value, rating: meta.rating ?? "" });
  }
  const vitalStats = VITAL_ORDER.filter((name) => vitalsByMetric[name]?.length).map((name) => {
    const samples = vitalsByMetric[name];
    const sortedValues = samples.map((s) => s.value).sort((a, b) => a - b);
    const goodCount = samples.filter((s) => s.rating === "good").length;
    return { name, p75: percentile(sortedValues, 0.75), goodPct: Math.round((goodCount / samples.length) * 100), sampleCount: samples.length };
  });

  const countByName = Object.fromEntries(byName.map((b) => [b.name, b._count._all]));
  const formStarted = countByName[EVENT.CONSULTATION_FORM_STARTED] ?? 0;
  const submitted = countByName[EVENT.CONSULTATION_SUBMITTED] ?? 0;
  const conversionRate = formStarted > 0 ? Math.round((submitted / formStarted) * 100) : null;

  const qualStarted = countByName[EVENT.QUALIFICATION_STARTED] ?? 0;
  const qualCompleted = countByName[EVENT.QUALIFICATION_COMPLETED] ?? 0;
  const qualRate = qualStarted > 0 ? Math.round((qualCompleted / qualStarted) * 100) : null;

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">آنالیتیکس</h1>
      <p className="mt-1 text-sm text-secondary">{DAYS} روز اخیر، ردیابی رویداد مستقیم توسط خود سایت — بدون سرویس شخص ثالث، بدون آمار ساختگی.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs text-secondary">سشن‌های یکتا</p>
          <p className="font-latin mt-1 text-3xl font-bold text-purple-900">{totalSessions.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs text-secondary">نرخ تبدیل فرم مشاوره</p>
          <p className="font-latin mt-1 text-3xl font-bold text-purple-900">{conversionRate === null ? "—" : `${conversionRate}%`}</p>
          <p className="mt-1 text-xs text-secondary">
            {submitted} از {formStarted} فرم شروع‌شده ارسال شد
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs text-secondary">نرخ تکمیل ویزارد صلاحیت‌سنجی</p>
          <p className="font-latin mt-1 text-3xl font-bold text-purple-900">{qualRate === null ? "—" : `${qualRate}%`}</p>
          <p className="mt-1 text-xs text-secondary">
            {qualCompleted} از {qualStarted} ویزارد شروع‌شده تکمیل شد
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-white p-5">
        <h2 className="text-sm font-bold text-purple-900">وب وایتالز</h2>
        <p className="mt-1 text-xs text-secondary">p75 (صدک ۷۵ام) — روش استاندارد گزارش‌دهی وب وایتالز. فقط بازدیدکنندگانی که رضایت آنالیتیکس را پذیرفته‌اند شمارش می‌شوند.</p>
        {vitalStats.length === 0 ? (
          <p className="mt-4 text-sm text-secondary">هنوز نمونه‌ای از وب وایتالز در این بازه ثبت نشده.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {vitalStats.map((v) => (
              <div key={v.name} className="rounded-lg bg-tint p-3">
                <p className="font-latin text-xs font-semibold text-secondary" title={VITAL_LABEL[v.name]}>
                  {v.name}
                </p>
                <p className="font-latin mt-1 text-xl font-bold text-purple-900">{formatVitalValue(v.name, v.p75)}</p>
                <p className={`mt-1 text-xs font-medium ${v.goodPct >= 75 ? "text-success" : v.goodPct >= 50 ? "text-warning" : "text-danger"}`}>{v.goodPct}٪ خوب</p>
                <p className="font-latin text-[10px] text-secondary">{v.sampleCount} نمونه</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-purple-900">رویدادها بر اساس نوع</h2>
          {byName.length === 0 ? (
            <p className="text-sm text-secondary">هنوز رویدادی در این بازه ثبت نشده.</p>
          ) : (
            <ul className="space-y-2.5">
              {byName
                .sort((a, b) => b._count._all - a._count._all)
                .map((row) => (
                  <li key={row.name} className="flex items-center justify-between text-sm">
                    <span className="text-body">{EVENT_LABEL[row.name] ?? row.name}</span>
                    <span className="font-latin font-semibold text-purple-900">{row._count._all}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-purple-900">پربازدیدترین صفحات</h2>
          {topPaths.length === 0 ? (
            <p className="text-sm text-secondary">هنوز بازدید صفحه‌ای در این بازه ثبت نشده.</p>
          ) : (
            <ul className="space-y-2.5">
              {topPaths.map((row) => (
                <li key={row.path} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-latin truncate text-body">{row.path}</span>
                  <span className="font-latin shrink-0 font-semibold text-purple-900">{row._count._all}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
