import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { FilterChip } from "@/components/crm/customer/OldCrmParts";
import { leadReports } from "@/lib/crm/lead-work";

import { getOpsI18n } from "@/lib/ops-i18n/server";
/**
 * «گزارش لیدها»: for leads created in the period — per operator (the lead's owner): leads, contracts, conversion,
 * closed, still open, how many got a logged call, median time to the first logged call, median days to the
 * contract; per contract type: leads and conversion. Funnel per source and closing reasons are on /ops/leads.
 */
export const dynamic = "force-dynamic";
const PERIODS = [30, 90, 365];
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export default async function LeadReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { t, intl } = await getOpsI18n();
  const fa = (n: number) => n.toLocaleString(intl);
  const pct = (a: number, b: number) => (b ? t("{n}٪", { n: fa(Math.round((a / b) * 100)) }) : "—");
  const hours = (h: number | null) => (h === null ? "—" : h < 48 ? t("{n} ساعت", { n: fa(Math.round(h)) }) : t("{n} روز", { n: fa(Math.round(h / 24)) }));
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/leads/reports");
  if (!canAccessPipeline(session.user.role)) redirect("/ops");
  const period = PERIODS.includes(Number((await searchParams).period)) ? Number((await searchParams).period) : 90;
  const { operators, types } = await leadReports(daysAgo(period));
  const th = "px-4 py-3 text-start font-medium";
  const td = "px-4 py-2.5 tabular-nums";

  return (
    <div className="container-page py-8">
      <Link href="/ops/leads" className="text-sm font-medium text-secondary hover:text-purple-600">
        {t("← لیدها")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-purple-900">{t("گزارش لیدها")}</h1>
      <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-secondary">
        {t("سرنخ‌هایی که در این بازه ثبت شده‌اند. «تماس ثبت‌شده» یعنی تماسی که در CRM روی خود سرنخ ثبت شده (دکمه‌ی «نتیجه تماس» برای هر تماس یکی ثبت می‌کند)؛ تماس‌هایی که قبلاً ثبت نمی‌شدند در این عددها نیستند. قیف به تفکیک منبع و دلیل بستن در صفحه‌ی لیدهاست.")}
      </p>
      <div className="mt-5 flex gap-1.5">
        {PERIODS.map((p) => (
          <FilterChip key={p} href={`/ops/leads/reports${p === 90 ? "" : `?period=${p}`}`} active={period === p}>
            {t("{n} روز اخیر", { n: fa(p) })}
          </FilterChip>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-purple-900">{t("به تفکیک مسئول")}</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className={th}>{t("مسئول")}</th>
                <th className={th}>{t("سرنخ")}</th>
                <th className={th}>{t("قرارداد شد")}</th>
                <th className={th}>{t("نرخ تبدیل")}</th>
                <th className={th}>{t("بسته شد")}</th>
                <th className={th}>{t("باز")}</th>
                <th className={th}>{t("با تماس ثبت‌شده")}</th>
                <th className={th}>{t("تا اولین تماس (میانه)")}</th>
                <th className={th}>{t("تا قرارداد (میانه)")}</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((o) => (
                <tr key={o.owner} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium text-purple-900">{o.owner}</td>
                  <td className={td}>{fa(o.leads)}</td>
                  <td className={td}>{fa(o.converted)}</td>
                  <td className={`${td} font-semibold text-purple-900`}>{pct(o.converted, o.leads)}</td>
                  <td className={`${td} text-secondary`}>{fa(o.closed)}</td>
                  <td className={`${td} text-secondary`}>{fa(o.open)}</td>
                  <td className={td}>{pct(o.called, o.leads)}</td>
                  <td className={td}>{hours(o.medianFirstCallHours)}</td>
                  <td className={td}>{o.medianDaysToContract === null ? "—" : t("{n} روز", { n: fa(Math.round(o.medianDaysToContract)) })}</td>
                </tr>
              ))}
              {operators.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-secondary">
                    {t("سرنخی در این بازه نیست.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-purple-900">{t("به تفکیک نوع قرارداد")}</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className={th}>{t("نوع قرارداد")}</th>
                <th className={th}>{t("سرنخ")}</th>
                <th className={th}>{t("قرارداد شد")}</th>
                <th className={th}>{t("نرخ تبدیل")}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.type} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-body">{t.type}</td>
                  <td className={td}>{fa(t.leads)}</td>
                  <td className={td}>{fa(t.converted)}</td>
                  <td className={`${td} font-semibold text-purple-900`}>{pct(t.converted, t.leads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
