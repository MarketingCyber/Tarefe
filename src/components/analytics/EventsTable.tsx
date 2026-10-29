import { filtersToQuery, type AnalyticsFilters, type Dim } from "@/lib/analytics-report";
import { EVENT_TABLE_COLUMNS, EVENT_TABLE_DIMS, type EventTableColumn, type EventTableRow } from "@/lib/landing-report";
import { Hint } from "./StatTiles";
import { HiddenFields } from "./HiddenFields";
import { DIM_LABEL, dimValueLabel } from "./labels";

/**
 * Every action we count without cookie consent, in one table you can pivot: group by up
 * to three ways the visitor arrived (source, medium, campaign, device, landing page …) and
 * read off visits, page views, calculator use, tariff clicks, form starts, WhatsApp / phone
 * clicks, banner clicks and real requests for each group.
 */
const FIELD = "w-full rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";
const LABEL = "mb-1 block text-[11px] font-medium text-secondary";

const fmt = (v: number | null) => (v === null ? "—" : v.toLocaleString("en-US"));

export function EventsTable({ filters: f, groupBy, rows, totals }: { filters: AnalyticsFilters; groupBy: Dim[]; rows: EventTableRow[]; totals: Record<EventTableColumn, number | null> }) {
  const levels = [groupBy[0], groupBy[1] ?? "", groupBy[2] ?? ""];
  const options = EVENT_TABLE_DIMS.map((d) => ({ value: d, label: DIM_LABEL[d] ?? d }));

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-purple-900">All recorded events</h2>
      <p className="mt-0.5 max-w-[85ch] text-xs leading-relaxed text-secondary">
        Everything counted without cookie consent, grouped the way you choose. Actions are matched to how that visitor arrived, so a click shows under the source of the visit it happened in; when the arrival was not recorded it shows as &quot;(not set)&quot;. Each action is counted once per visitor per day.
      </p>

      <form method="get" action="/ops/analytics" className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
        <HiddenFields query={filtersToQuery(f, { gb: undefined })} />
        {levels.map((value, i) => (
          <div key={i} className="min-w-[10rem]">
            <label className={LABEL}>{i === 0 ? "Group by (level 1)" : `Level ${i + 1}`}</label>
            <select name="gb" defaultValue={value} className={FIELD}>
              {i > 0 && <option value="">— none —</option>}
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button type="submit" className="press rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
          Apply
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-tint text-left text-xs font-semibold text-secondary">
              {groupBy.map((d) => (
                <th key={d} className="whitespace-nowrap px-4 py-3">
                  {DIM_LABEL[d] ?? d}
                </th>
              ))}
              {EVENT_TABLE_COLUMNS.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {c.label}
                    <Hint text={c.hint} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={groupBy.length + EVENT_TABLE_COLUMNS.length} className="px-4 py-8 text-center text-secondary">
                  Nothing recorded in this period.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.keys.join("|")} className="border-t border-border">
                {r.keys.map((k, i) => (
                  <td key={i} className="whitespace-nowrap px-4 py-2.5 font-medium text-purple-900">
                    <bdi className={groupBy[i] === "landing" || groupBy[i] === "landing_group" ? "font-latin" : ""}>{dimValueLabel(groupBy[i], k)}</bdi>
                  </td>
                ))}
                {EVENT_TABLE_COLUMNS.map((c) => (
                  <td key={c.key} className="font-latin whitespace-nowrap px-4 py-2.5 text-right text-body">
                    {fmt(r.values[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-tint font-bold text-purple-900">
                <td colSpan={groupBy.length} className="px-4 py-3">
                  Total
                </td>
                {EVENT_TABLE_COLUMNS.map((c) => (
                  <td key={c.key} className="font-latin whitespace-nowrap px-4 py-3 text-right">
                    {fmt(totals[c.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="mt-2 text-[11px] text-secondary">The total row counts each visitor once, so it can be lower than the sum of the rows. The table shows the top 200 groups.</p>
    </section>
  );
}
