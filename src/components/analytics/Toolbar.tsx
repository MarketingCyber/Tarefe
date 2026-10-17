import { CalendarBlank, CaretDown, Check } from "@phosphor-icons/react/dist/ssr";
import { filtersToQuery, type AnalyticsFilters, type DateRange } from "@/lib/analytics-report";
import { Dropdown, NavLink } from "./DashboardShell";
import { HiddenFields } from "./HiddenFields";
import { PRESET_PLAIN } from "./labels";

/**
 * The date range for the whole page, as links to the same page with different query
 * params (the URL is the exact, shareable state of the view). This page only shows
 * numbers that need no cookie consent, so there are no other filters.
 */
const ROW = "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm text-body transition-colors hover:bg-tint";
const ROW_ACTIVE = "bg-purple-600/[0.07] font-semibold text-purple-900";

export function Toolbar({ d }: { d: { filters: AnalyticsFilters; range: DateRange } }) {
  const f = d.filters;
  const href = (over: Record<string, string | undefined>) => `?${filtersToQuery(f, over)}`;

  const presetLabel = PRESET_PLAIN[f.preset];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {/* -------- date */}
        <Dropdown
          ariaLabel="Date range"
          label={
            <>
              <CalendarBlank size={16} className="text-purple-600" />
              <span>{presetLabel}</span>
              <span className="font-latin hidden text-xs font-normal text-secondary sm:inline">
                {d.range.from} → {d.range.to}
              </span>
              <CaretDown size={12} className="text-secondary" />
            </>
          }
        >
          <ul>
            {(["today", "yesterday", "7d", "14d", "30d", "90d", "mtd"] as const).map((p) => (
              <li key={p}>
                <NavLink href={href({ p, from: undefined, to: undefined })} active={f.preset === p} className={`${ROW} ${f.preset === p ? ROW_ACTIVE : ""}`}>
                  {PRESET_PLAIN[p]}
                  {f.preset === p && <Check size={16} weight="bold" className="text-purple-600" />}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 border-t border-border px-3 pb-2 pt-3">
            <p className="mb-2 text-[11px] font-medium text-secondary">Custom range</p>
            <form method="get" action="/ops/analytics" className="flex items-center gap-2">
              <HiddenFields query={filtersToQuery(f, { p: undefined, from: undefined, to: undefined })} />
              <input type="hidden" name="p" value="custom" />
              <input type="date" name="from" required defaultValue={f.preset === "custom" ? d.range.from : ""} aria-label="From date" className="font-latin min-w-0 flex-1 rounded-lg border border-border-strong px-2 py-1.5 text-xs" />
              <input type="date" name="to" required defaultValue={f.preset === "custom" ? d.range.to : ""} aria-label="To date" className="font-latin min-w-0 flex-1 rounded-lg border border-border-strong px-2 py-1.5 text-xs" />
              <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">
                Go
              </button>
            </form>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
