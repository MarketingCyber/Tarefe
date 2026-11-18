import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessMarketing } from "@/lib/permissions";
import { FilterChip } from "@/components/crm/customer/OldCrmParts";
import { leadReports, type KpiRow } from "@/lib/crm/lead-work";
import { BackLink } from "@/components/crm/BackLink";
import { getOpsI18n } from "@/lib/ops-i18n/server";

/**
 * «گزارش لیدها» (marketing section): for leads created in the period, the same KPIs per dimension — leads, contracts,
 * conversion, closed, still open, share with a logged call, median time to the first logged call, median days to the
 * contract.
 * - Source / medium or campaign (owner 2026-11-18), from the old CRM's UTM fields; leads without UTM are «(not set)»
 *   under their «نحوه آشنایی» value. The coverage line says how many leads have UTM at all.
 * - Owner (operator) and contract type.
 */
export const dynamic = "force-dynamic";
const PERIODS = [30, 90, 365];
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

type Search = { period?: string; dim?: string };

export default async function LeadReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { t, tn, intl } = await getOpsI18n();
  const fa = (n: number) => n.toLocaleString(intl);
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/leads/reports");
  if (!canAccessMarketing(session.user.role)) redirect("/ops");
  const sp = await searchParams;
  const period = PERIODS.includes(Number(sp.period)) ? Number(sp.period) : 90;
  const dim = sp.dim === "campaign" ? "campaign" : "source";
  const { operators, types, sources, campaigns, withUtm, total } = await leadReports(daysAgo(period));
  const href = (patch: Partial<Record<keyof Search, string | null>>) => {
    const merged = { period: period === 90 ? null : String(period), dim: dim === "source" ? null : dim, ...patch };
    const qs = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1])).toString();
    return `/ops/leads/reports${qs ? `?${qs}` : ""}`;
  };
  const marketingRows = dim === "campaign" ? campaigns : sources;

  return (
    <div className="container-page py-8">
      <BackLink fallback="/ops/leads" />
      <h1 className="text-2xl font-bold text-purple-900">{t("گزارش لیدها")}</h1>
      <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-secondary">
        {t("سرنخ‌هایی که در این بازه ثبت شده‌اند. «تماس ثبت‌شده» یعنی تماسی که در CRM روی خود سرنخ ثبت شده (دکمه‌ی «نتیجه تماس» برای هر تماس یکی ثبت می‌کند)؛ تماس‌هایی که قبلاً ثبت نمی‌شدند در این عددها نیستند. قیف به تفکیک منبع و دلیل بستن در صفحه‌ی لیدهاست.")}
      </p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <FilterChip key={p} href={href({ period: p === 90 ? null : String(p) })} active={period === p}>
            {t("{n} روز اخیر", { n: fa(p) })}
          </FilterChip>
        ))}
      </div>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-purple-900">{dim === "campaign" ? t("به تفکیک کمپین") : t("به تفکیک منبع / رسانه (Source / Medium)")}</h2>
          <div className="flex gap-1.5">
            <FilterChip href={href({ dim: null })} active={dim === "source"}>
              Source / Medium
            </FilterChip>
            <FilterChip href={href({ dim: "campaign" })} active={dim === "campaign"}>
              {t("کمپین")}
            </FilterChip>
          </div>
        </div>
        <p className="mt-1 text-xs text-secondary">
          {t("{n} از {all} سرنخ این بازه UTM دارند (سایت جدید از اواخر اکتبر ۲۰۲۶ می‌فرستد). بقیه «(not set)» هستند، به تفکیک «نحوه آشنایی» در CRM قدیم.", {
            n: fa(withUtm),
            all: fa(total),
          })}
        </p>
        <KpiTable
          rows={marketingRows}
          first={dim === "campaign" ? t("کمپین") : "Source / Medium"}
          label={(r) => (
            <span className="font-latin" dir="ltr">
              {r.key}
              {r.fallback !== undefined && <span className="text-secondary"> · {r.fallback ? tn(r.fallback) : t("نامشخص")}</span>}
            </span>
          )}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-purple-900">{t("به تفکیک مسئول")}</h2>
        <KpiTable rows={operators.map((o) => ({ ...o, key: o.owner }))} first={t("مسئول")} label={(r) => <bdi>{r.key}</bdi>} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-purple-900">{t("به تفکیک نوع قرارداد")}</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">{t("نوع قرارداد")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("سرنخ")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("قرارداد شد")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("نرخ تبدیل")}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((ty) => (
                <tr key={ty.type} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-body">
                    <bdi>{tn(ty.type)}</bdi>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{fa(ty.leads)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{fa(ty.converted)}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold text-purple-900">{ty.leads ? t("{n}٪", { n: fa(Math.round((ty.converted / ty.leads) * 100)) }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** The KPI columns, the same for every dimension. */
async function KpiTable({ rows, first, label }: { rows: KpiRow[]; first: string; label: (r: KpiRow) => React.ReactNode }) {
  const { t, intl } = await getOpsI18n();
  const fa = (n: number) => n.toLocaleString(intl);
  const pct = (a: number, b: number) => (b ? t("{n}٪", { n: fa(Math.round((a / b) * 100)) }) : "—");
  const hours = (h: number | null) => (h === null ? "—" : h < 48 ? t("{n} ساعت", { n: fa(Math.round(h)) }) : t("{n} روز", { n: fa(Math.round(h / 24)) }));
  const th = "px-4 py-3 text-start font-medium";
  const td = "px-4 py-2.5 tabular-nums";
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-secondary">
            <th className={th}>{first}</th>
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
          {rows.map((r) => (
            <tr key={`${r.key}|${r.fallback ?? ""}`} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 font-medium text-purple-900">{label(r)}</td>
              <td className={td}>{fa(r.leads)}</td>
              <td className={td}>{fa(r.converted)}</td>
              <td className={`${td} font-semibold text-purple-900`}>{pct(r.converted, r.leads)}</td>
              <td className={`${td} text-secondary`}>{fa(r.closed)}</td>
              <td className={`${td} text-secondary`}>{fa(r.open)}</td>
              <td className={td}>{pct(r.called, r.leads)}</td>
              <td className={td}>{hours(r.medianFirstCallHours)}</td>
              <td className={td}>{r.medianDaysToContract === null ? "—" : t("{n} روز", { n: fa(Math.round(r.medianDaysToContract)) })}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-4 text-secondary">
                {t("سرنخی در این بازه نیست.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
