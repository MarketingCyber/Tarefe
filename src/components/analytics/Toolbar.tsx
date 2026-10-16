import { CalendarBlank, CaretDown, Check, DownloadSimple, FunnelSimple, GearSix, X } from "@phosphor-icons/react/dist/ssr";
import { DIMENSION_KEYS, filtersToQuery, type Dim } from "@/lib/analytics-report";
import type { Dashboard } from "@/lib/analytics-dashboard";
import { Dropdown, NavLink } from "./DashboardShell";
import { HiddenFields } from "./HiddenFields";
import { DIM_LABEL, PRESET_PLAIN, dimValueLabel, eventLabel } from "./labels";

/**
 * ONE slim row above everything it scopes (date · filters · settings), with the
 * active filters as removable chips beside it. Every item is a link to the same
 * page with different query params — choosing applies immediately, there is no
 * "Apply" button, and the URL is always the exact, shareable state of the view.
 */
const ROW = "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm text-body transition-colors hover:bg-tint";
const ROW_ACTIVE = "bg-purple-600/[0.07] font-semibold text-purple-900";
const SECTION = "px-3 pb-1 pt-2 text-[11px] font-medium text-secondary";

const FILTER_GROUPS: { title: string; dims: Dim[] }[] = [
  { title: "Where they came from", dims: ["channel", "source", "medium", "campaign", "content", "term"] },
  { title: "Page and language", dims: ["landing", "locale", "category", "service"] },
  { title: "What they used", dims: ["device", "browser", "os", "visitor_type"] },
];

export function Toolbar({ d }: { d: Dashboard }) {
  const f = d.filters;
  const href = (over: Record<string, string | undefined>) => `?${filtersToQuery(f, over)}`;
  const activeDims = (Object.entries(f.dims) as [Dim, string][]).filter(([, v]) => v);
  const filterCount = activeDims.length + (f.landingQ ? 1 : 0) + (f.events.length ? 1 : 0);

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
          <div className="mt-1 border-t border-border pt-1.5">
            <NavLink href={href({ cmp: f.compare ? undefined : "1" })} active={f.compare} className={`${ROW} ${f.compare ? ROW_ACTIVE : ""}`}>
              Compare with the previous period
              {f.compare && <Check size={16} weight="bold" className="text-purple-600" />}
            </NavLink>
          </div>
        </Dropdown>

        {/* -------- filters */}
        <Dropdown
          ariaLabel="Filters"
          panelClassName="sm:w-[19rem]"
          label={
            <>
              <FunnelSimple size={16} className="text-purple-600" />
              <span>Filter</span>
              {filterCount > 0 && <span className="font-latin rounded-full bg-purple-600 px-1.5 text-[11px] font-semibold leading-5 text-white">{filterCount}</span>}
              <CaretDown size={12} className="text-secondary" />
            </>
          }
        >
          {FILTER_GROUPS.map((g) => (
            <div key={g.title}>
              <p className={SECTION}>{g.title}</p>
              {g.dims.map((dim) => {
                const values = (d.options.dims[dim] ?? []).filter((o) => o.value !== "(not set)" || dim === "channel").slice(0, 12);
                const current = f.dims[dim];
                return (
                  <details key={dim} className="group" open={!!current}>
                    <summary className={`${ROW} cursor-pointer list-none [&::-webkit-details-marker]:hidden ${current ? ROW_ACTIVE : ""}`}>
                      <span>{DIM_LABEL[dim]}</span>
                      <span className="flex items-center gap-1.5 text-xs text-secondary">
                        {current && <span className="max-w-[7rem] truncate">{dimValueLabel(dim, current)}</span>}
                        <CaretDown size={11} className="transition-transform duration-150 group-open:rotate-180" />
                      </span>
                    </summary>
                    <ul className="mb-1 ms-3 border-s border-border ps-1">
                      {values.length === 0 && <li className="px-3 py-1.5 text-xs text-secondary">No values recorded</li>}
                      {values.map((o) => (
                        <li key={o.value}>
                          <NavLink href={href({ [`f_${dim}`]: o.value })} active={current === o.value} className={`${ROW} py-1.5 text-[13px] ${current === o.value ? ROW_ACTIVE : ""}`}>
                            <span className="min-w-0 truncate" dir="auto">
                              {dimValueLabel(dim, o.value)}
                            </span>
                            <span className="font-latin shrink-0 text-[11px] text-secondary">{o.sessions}</span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          ))}
          <div className="mt-1.5 border-t border-border px-3 pb-2 pt-3">
            <form method="get" action="/ops/analytics">
              <HiddenFields query={filtersToQuery(f, { lq: undefined })} />
              <label htmlFor="tb-lq" className="mb-1.5 block text-[11px] font-medium text-secondary">
                Landing page contains…
              </label>
              <div className="flex gap-2">
                <input id="tb-lq" name="lq" defaultValue={f.landingQ} placeholder="/services/energy" dir="ltr" className="font-latin min-w-0 flex-1 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs" />
                <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">
                  Apply
                </button>
              </div>
            </form>
          </div>
        </Dropdown>

        {/* -------- settings + export, pushed to the far end */}
        <div className="ms-auto flex items-center gap-2">
          <Dropdown
            ariaLabel="Settings"
            align="end"
            panelClassName="sm:w-[20rem]"
            label={
              <>
                <GearSix size={16} className="text-purple-600" />
                <span>Settings</span>
              </>
            }
          >
            <p className={SECTION}>How should the source of a visit be counted?</p>
            {(
              [
                ["visit", "This visit", "How this very visit arrived. Direct means it really arrived directly (default)."],
                ["last", "Last touch", "The last real source a returning visitor came from; a direct visit does not replace it."],
                ["first", "First touch", "The source that first brought the visitor to the site."],
              ] as const
            ).map(([v, title, desc]) => (
              <NavLink key={v} href={href({ attr: v === "visit" ? undefined : v })} active={f.attribution === v} className={`${ROW} items-start ${f.attribution === v ? ROW_ACTIVE : ""}`}>
                <span>
                  <span className="block">{title}</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-secondary">{desc}</span>
                </span>
                {f.attribution === v && <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-purple-600" />}
              </NavLink>
            ))}
            <p className={`${SECTION} mt-1`}>How the funnel counts steps</p>
            {(
              [
                ["open", "Each step on its own", "Someone can submit the form without ever seeing the calculator."],
                ["strict", "In sequence", "Only people who also did every earlier step."],
              ] as const
            ).map(([v, title, desc]) => (
              <NavLink key={v} href={href({ fm: v === "strict" ? "strict" : undefined })} active={f.funnelMode === v} className={`${ROW} items-start ${f.funnelMode === v ? ROW_ACTIVE : ""}`}>
                <span>
                  <span className="block">{title}</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-secondary">{desc}</span>
                </span>
                {f.funnelMode === v && <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-purple-600" />}
              </NavLink>
            ))}
          </Dropdown>
          <a
            href={`/ops/analytics/export?${filtersToQuery(f, { gb: f.srcDim })}`}
            className="press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong bg-white px-3.5 text-sm font-medium text-purple-900 transition-colors hover:border-purple-600"
            title="Download the sources table as CSV"
          >
            <DownloadSimple size={16} className="text-purple-600" />
            <span className="hidden sm:inline">CSV</span>
          </a>
        </div>
      </div>

      {/* -------- active filters, removable */}
      {filterCount > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {activeDims.map(([dim, v]) => (
            <li key={dim}>
              <NavLink href={href({ [`f_${dim}`]: undefined })} title="Remove filter" className="press inline-flex min-h-8 items-center gap-1.5 rounded-full bg-purple-600/10 ps-3 pe-2 text-xs font-medium text-purple-900 transition-colors hover:bg-purple-600/20">
                <span className="text-secondary">{DIM_LABEL[dim]}:</span>
                <span dir="auto">{dimValueLabel(dim, v)}</span>
                <X size={12} weight="bold" />
              </NavLink>
            </li>
          ))}
          {f.landingQ && (
            <li>
              <NavLink href={href({ lq: undefined })} title="Remove filter" className="press inline-flex min-h-8 items-center gap-1.5 rounded-full bg-purple-600/10 ps-3 pe-2 text-xs font-medium text-purple-900 transition-colors hover:bg-purple-600/20">
                <span className="text-secondary">Page contains:</span>
                <span className="font-latin" dir="ltr">
                  {f.landingQ}
                </span>
                <X size={12} weight="bold" />
              </NavLink>
            </li>
          )}
          {f.events.length > 0 && (
            <li>
              <NavLink href={href({ ev: undefined })} title="Remove filter" className="press inline-flex min-h-8 items-center gap-1.5 rounded-full bg-purple-600/10 ps-3 pe-2 text-xs font-medium text-purple-900 transition-colors hover:bg-purple-600/20">
                <span className="text-secondary">Event:</span>
                <span>{f.events.map(eventLabel).join(", ")}</span>
                <X size={12} weight="bold" />
              </NavLink>
            </li>
          )}
          <li>
            <NavLink href={href(Object.fromEntries([...DIMENSION_KEYS.map((x) => [`f_${x}`, undefined]), ["lq", undefined], ["ev", undefined]]))} className="text-xs font-medium text-secondary underline-offset-2 hover:text-purple-600 hover:underline">
              Clear all
            </NavLink>
          </li>
        </ul>
      )}
    </div>
  );
}
