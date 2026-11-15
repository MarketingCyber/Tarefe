import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { FilterChip } from "@/components/crm/customer/OldCrmParts";
import { leadReports } from "@/lib/crm/lead-work";

/**
 * «گزارش لیدها»: for leads created in the period — per operator (the lead's owner): leads, contracts, conversion,
 * closed, still open, how many got a logged call, median time to the first logged call, median days to the
 * contract; per contract type: leads and conversion. Funnel per source and closing reasons are on /ops/leads.
 */
export const dynamic = "force-dynamic";
const PERIODS = [30, 90, 365];
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const fa = (n: number) => n.toLocaleString("fa-IR");
const pct = (a: number, b: number) => (b ? `${fa(Math.round((a / b) * 100))}٪` : "—");
const hours = (h: number | null) => (h === null ? "—" : h < 48 ? `${fa(Math.round(h))} ساعت` : `${fa(Math.round(h / 24))} روز`);

export default async function LeadReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
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
        ← لیدها
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-purple-900">گزارش لیدها</h1>
      <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-secondary">
        سرنخ‌هایی که در این بازه ثبت شده‌اند. «تماس ثبت‌شده» یعنی تماسی که در CRM روی خود سرنخ ثبت شده (دکمه‌ی «نتیجه تماس» برای هر تماس یکی ثبت می‌کند)؛ تماس‌هایی که
        قبلاً ثبت نمی‌شدند در این عددها نیستند. قیف به تفکیک منبع و دلیل بستن در صفحه‌ی لیدهاست.
      </p>
      <div className="mt-5 flex gap-1.5">
        {PERIODS.map((p) => (
          <FilterChip key={p} href={`/ops/leads/reports${p === 90 ? "" : `?period=${p}`}`} active={period === p}>
            {fa(p)} روز اخیر
          </FilterChip>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-purple-900">به تفکیک مسئول</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className={th}>مسئول</th>
                <th className={th}>سرنخ</th>
                <th className={th}>قرارداد شد</th>
                <th className={th}>نرخ تبدیل</th>
                <th className={th}>بسته شد</th>
                <th className={th}>باز</th>
                <th className={th}>با تماس ثبت‌شده</th>
                <th className={th}>تا اولین تماس (میانه)</th>
                <th className={th}>تا قرارداد (میانه)</th>
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
                  <td className={td}>{o.medianDaysToContract === null ? "—" : `${fa(Math.round(o.medianDaysToContract))} روز`}</td>
                </tr>
              ))}
              {operators.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-secondary">
                    سرنخی در این بازه نیست.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-purple-900">به تفکیک نوع قرارداد</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className={th}>نوع قرارداد</th>
                <th className={th}>سرنخ</th>
                <th className={th}>قرارداد شد</th>
                <th className={th}>نرخ تبدیل</th>
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
