import { METRICS, formatValue, type MetricKey, type TrendKpi } from "@/lib/analytics-report";
import type { Dashboard } from "@/lib/analytics-dashboard";
import { KPI_PLAIN } from "./labels";

/**
 * The headline numbers. One HERO figure (leads — the outcome the business
 * exists for) and four supporting tiles, each with:
 *  - a label in plain words + a "?" that explains it in one sentence,
 *  - the value (proportional figures, not tabular: big standalone numbers
 *    look loose with equal-width digits),
 *  - a change vs the previous period when "compare" is on (colour = direction
 *    × whether up is good; percentage POINTS for rates), and
 *  - a mini trend line in the accent colour, with an end dot.
 */
const ACCENT = "#5d0089";

export function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="What does this mean?"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border-strong text-[10px] leading-none text-secondary transition-colors hover:border-purple-600 hover:text-purple-600 focus-visible:border-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/30"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-20 hidden rounded-lg bg-purple-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-focus-within:block group-hover:block sm:absolute sm:inset-x-auto sm:bottom-auto sm:start-1/2 sm:top-full sm:mt-2 sm:w-60 sm:-translate-x-1/2 sm:rtl:translate-x-1/2"
      >
        {text}
      </span>
    </span>
  );
}

export function Sparkline({ values, height }: { values: number[]; height: number }) {
  const n = values.length;
  const max = Math.max(...values, 0);
  const flat = max === 0 || n < 2;
  const W = 100;
  const pad = 3;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => (flat ? height - pad : pad + (1 - v / max) * (height - pad * 2));
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values[n - 1] ?? 0;
  return (
    <div dir="ltr" className="relative mt-3" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {!flat && <polygon points={`0,${height} ${pts} ${W},${height}`} fill={ACCENT} fillOpacity="0.08" />}
        <polyline fill="none" stroke={flat ? "#ddccE4" : ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={pts || `0,${height - pad} ${W},${height - pad}`} />
      </svg>
      {!flat && <span className="absolute h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white" style={{ right: 0, top: y(last), background: ACCENT }} />}
    </div>
  );
}

function Delta({ cur, prev, format, invert }: { cur: number; prev: number; format: "int" | "decimal" | "percent" | "duration"; invert?: boolean }) {
  if (prev === 0 && cur === 0) return null;
  let text: string;
  let change: number;
  if (format === "percent") {
    change = (cur - prev) * 100;
    text = `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} pts`;
  } else {
    if (prev === 0) return <span className="text-xs text-secondary">new</span>;
    change = ((cur - prev) / prev) * 100;
    text = `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(0)}%`;
  }
  const flat = Math.abs(change) < 0.05;
  const good = invert ? change < 0 : change > 0;
  return (
    <span className={`text-xs font-semibold ${flat ? "text-secondary" : good ? "text-success" : "text-danger"}`} title="Compared with the previous period">
      {flat ? "no change" : text}
    </span>
  );
}

type TileKpi = Exclude<TrendKpi, never>;

function value(d: Dashboard, kpi: TileKpi, which: "totals" | "previousTotals"): number | null {
  const t = d[which];
  if (!t) return null;
  if (kpi === "leads_crm") return t.leads;
  return t.values[kpi as MetricKey];
}

function Tile({ d, kpi, hero }: { d: Dashboard; kpi: TileKpi; hero?: boolean }) {
  const meta = KPI_PLAIN[kpi];
  const cur = value(d, kpi, "totals");
  const prev = value(d, kpi, "previousTotals");
  const format = kpi === "leads_crm" ? "int" : METRICS[kpi as MetricKey].format;
  const sub = kpi === "sessions" ? `from ${formatValue("int", d.totals.values.users)} visitors` : kpi === "conv_rate" ? `${formatValue("int", d.totals.values.submissions)} form submissions` : kpi === "leads_crm" && cur === null ? "not available with this filter" : undefined;
  return (
    <div className={`flex min-w-0 flex-col rounded-2xl border border-border bg-white p-4 sm:p-5 ${hero ? "col-span-2 lg:col-span-1 lg:row-span-2 lg:p-6" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-secondary">
        {meta.label}
        <Hint text={meta.hint} />
      </div>
      <p className={`font-latin mt-2 font-bold tracking-tight text-purple-900 ${hero ? "text-5xl lg:text-6xl" : "text-2xl sm:text-3xl"}`}>{cur === null ? "—" : formatValue(format, cur)}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-secondary">
        {prev !== null && cur !== null && <Delta cur={cur} prev={prev} format={format} />}
        {sub && <span>{sub}</span>}
      </div>
      <div className="mt-auto">
        <Sparkline values={d.tiles.series[kpi] ?? []} height={hero ? 88 : 34} />
      </div>
    </div>
  );
}

export function StatTiles({ d }: { d: Dashboard }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.25fr_1fr_1fr]">
      <Tile d={d} kpi="leads_crm" hero />
      <Tile d={d} kpi="sessions" />
      <Tile d={d} kpi="users" />
      <Tile d={d} kpi="conv_rate" />
      <Tile d={d} kpi="median_duration" />
    </div>
  );
}
