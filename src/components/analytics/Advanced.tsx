import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { DIMENSIONS, DIMENSION_KEYS, METRICS, METRIC_KEYS, filtersToQuery, type AnalyticsFilters, type BreakdownRow, type TotalsResult } from "@/lib/analytics-report";
import { NavLink } from "./DashboardShell";
import { BreakdownTable } from "./BreakdownTable";
import { HiddenFields } from "./HiddenFields";
import { eventLabel } from "./labels";

/**
 * The power tool, kept — but out of the way. A custom pivot (group by 1–3
 * dimensions, choose any columns, filter by event) and CSV export for the
 * person who needs more than the dashboard cards. Collapsed by default, and
 * its (heavier) query only runs once it has been opened, so it costs the
 * everyday view nothing.
 */
const FIELD = "rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";
const LABEL = "mb-1 block text-[11px] font-medium text-secondary";

function Select({ name, value, options, empty, label }: { name: string; value: string; options: { value: string; label: string }[]; empty?: string; label: string }) {
  return (
    <div className="min-w-0">
      <label className={LABEL}>{label}</label>
      <select name={name} defaultValue={value} className={`${FIELD} w-full`}>
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckChips({ name, options, checked }: { name: string; options: { value: string; label: string; hint?: string }[]; checked: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label key={o.value} title={o.hint} className="cursor-pointer">
          <input type="checkbox" name={name} value={o.value} defaultChecked={checked.includes(o.value)} className="peer sr-only" />
          <span className="inline-flex min-h-8 items-center rounded-full border border-border-strong bg-white px-3 text-xs font-medium text-body transition-colors duration-150 hover:border-purple-600 peer-checked:border-purple-600 peer-checked:bg-purple-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-purple-600/40">{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export function AdvancedSection({ filters: f, eventNames, breakdown, totals }: { filters: AnalyticsFilters; eventNames: string[]; breakdown: BreakdownRow[] | null; totals: TotalsResult | null }) {
  const gb = [f.groupBy[0], f.groupBy[1] ?? "", f.groupBy[2] ?? ""];
  const dimOptions = DIMENSION_KEYS.map((d) => ({ value: d, label: DIMENSIONS[d].label }));

  return (
    <section className="rounded-2xl border border-border bg-white">
      <NavLink href={`?${filtersToQuery(f, { adv: f.adv ? undefined : "1" })}`} className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-start transition-colors hover:bg-tint">
        <span>
          <span className="block text-base font-bold text-purple-900">Advanced tools</span>
          <span className="mt-0.5 block text-xs text-secondary">Custom table with up to three grouping levels, your choice of columns, an event filter and CSV download</span>
        </span>
        <CaretDown size={16} className={`shrink-0 text-secondary transition-transform duration-150 ${f.adv ? "rotate-180" : ""}`} />
      </NavLink>

      {f.adv && breakdown && totals && (
        <div className="border-t border-border p-5">
          <form method="get" action="/ops/analytics" className="space-y-4">
            <HiddenFields query={filtersToQuery({ ...f, adv: true }, { gb: undefined, m: undefined, ev: undefined, sort: undefined, dir: undefined })} />
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <Select name="gb" value={gb[0]} label="Group by (level 1)" options={dimOptions} />
              <Select name="gb" value={gb[1]} label="Level 2" empty="— none —" options={dimOptions} />
              <Select name="gb" value={gb[2]} label="Level 3" empty="— none —" options={dimOptions} />
              <button type="submit" className="press rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
                Apply
              </button>
            </div>
            <div>
              <span className={LABEL}>Table columns</span>
              <CheckChips name="m" checked={f.metrics} options={METRIC_KEYS.map((k) => ({ value: k, label: METRICS[k].label, hint: METRICS[k].hint }))} />
            </div>
            <details open={f.events.length > 0}>
              <summary className="cursor-pointer text-xs font-medium text-purple-600">Only visits that had at least one of these events {f.events.length > 0 && <span className="font-latin">({f.events.length})</span>}</summary>
              <div className="mt-3">
                <CheckChips name="ev" checked={f.events} options={eventNames.map((e) => ({ value: e, label: eventLabel(e) }))} />
              </div>
            </details>
          </form>
          <div className="mt-5">
            <BreakdownTable filters={f} breakdown={breakdown} totals={totals} />
          </div>
        </div>
      )}
    </section>
  );
}
