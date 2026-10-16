import { DIMENSIONS, LEADS_HINT, LEADS_KEY, LEADS_LABEL, METRICS, METRIC_KEYS, filtersToQuery, formatValue, type AnalyticsFilters, type BreakdownRow, type TotalsResult } from "@/lib/analytics-report";
import { valueLabel } from "./labels";

/**
 * The pivot: rows grouped by 1–3 dimensions the user picked, columns are the
 * metrics they ticked, sorted by any column (header links keep every other
 * filter). The CRM-leads column appears when every group-by dimension and
 * filter can be answered from the leads table; otherwise it is omitted rather
 * than shown as a misleading zero.
 */
export function BreakdownTable({ filters: f, breakdown, totals }: { filters: AnalyticsFilters; breakdown: BreakdownRow[]; totals: TotalsResult }) {
  const metricCols = METRIC_KEYS.filter((k) => f.metrics.includes(k));
  const showLeads = breakdown.some((r) => r.leads !== null);

  const sortLink = (key: string) => {
    const next = f.sort === key && f.dir === "desc" ? "asc" : "desc";
    return `?${filtersToQuery(f, { sort: key, dir: next })}`;
  };
  const arrow = (key: string) => (f.sort === key ? (f.dir === "desc" ? " ↓" : " ↑") : "");
  const th = "px-3 py-2.5 text-start text-xs font-medium text-secondary whitespace-nowrap";

  if (breakdown.length === 0) {
    return <p className="py-8 text-center text-sm text-secondary">No data to show.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-tint">
            <tr className="border-b border-border">
              {f.groupBy.map((d) => (
                <th key={d} className={th}>
                  <a href={sortLink(d)} className="hover:text-purple-600">
                    {DIMENSIONS[d].label}
                    {arrow(d)}
                  </a>
                </th>
              ))}
              {metricCols.map((k) => (
                <th key={k} className={th} title={METRICS[k].hint}>
                  <a href={sortLink(k)} className="hover:text-purple-600">
                    {METRICS[k].label}
                    {arrow(k)}
                  </a>
                </th>
              ))}
              {showLeads && (
                <th className={th} title={LEADS_HINT}>
                  <a href={sortLink(LEADS_KEY)} className="hover:text-purple-600">
                    {LEADS_LABEL}
                    {arrow(LEADS_KEY)}
                  </a>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => (
              <tr key={row.keys.join("|")} className="border-b border-border last:border-0 hover:bg-tint/60">
                {row.keys.map((k, i) => (
                  <td key={i} className="max-w-[22rem] truncate px-3 py-2.5 text-start font-medium text-purple-900" title={k}>
                    {/* <bdi> isolates the text direction per value (a Latin path next to a Persian "(not set)")
                        WITHOUT flipping the cell's alignment the way dir="auto" on the <td> does. */}
                    <bdi className="font-latin">{valueLabel(k)}</bdi>
                  </td>
                ))}
                {metricCols.map((k) => (
                  <td key={k} className="font-latin px-3 py-2.5 text-body tabular-nums">
                    {row.values[k] === undefined ? "—" : formatValue(METRICS[k].format, row.values[k] as number)}
                  </td>
                ))}
                {showLeads && <td className="font-latin px-3 py-2.5 font-semibold text-purple-900 tabular-nums">{row.leads === null ? "—" : formatValue("int", row.leads)}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-tint font-semibold">
              <td className="px-3 py-2.5 text-purple-900" colSpan={f.groupBy.length}>
                Total (with current filters)
              </td>
              {metricCols.map((k) => (
                <td key={k} className="font-latin px-3 py-2.5 text-purple-900 tabular-nums">
                  {formatValue(METRICS[k].format, totals.values[k])}
                </td>
              ))}
              {showLeads && <td className="font-latin px-3 py-2.5 text-purple-900 tabular-nums">{totals.leads === null ? "—" : formatValue("int", totals.leads)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-secondary">
        <span>
          {breakdown.length >= 200 ? "Showing the first 200 rows. " : ""}
          &quot;Users&quot; counts distinct browsers; the Users total is not the sum of the rows because one user can appear in several groups.
        </span>
        <a href={`/ops/analytics/export?${filtersToQuery(f)}`} className="font-medium text-purple-600 hover:text-purple-900">
          Download CSV ⬇
        </a>
      </div>
    </div>
  );
}
