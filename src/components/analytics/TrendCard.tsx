"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Table } from "@phosphor-icons/react";
import { formatTick, formatValue, type ValueFormat } from "@/lib/analytics-format";
import { Dropdown, NavLink } from "./DashboardShell";

/**
 * The main trend chart — the one place that needs client JavaScript.
 *
 * Reading it:
 *  - ONE measure per chart (the tabs switch it): never two measures on one axis.
 *  - One series → the brand purple with a soft area wash and an end dot.
 *    Several (a "split by") → a validated categorical palette, with a legend
 *    and, where lines separate, a direct label at the end of each.
 *  - Hover (or arrow keys) places a crosshair that snaps to the nearest
 *    bucket; ONE tooltip lists every series at that date, value first. The
 *    whole plot is the hit target, so nobody has to land on a 2px line.
 *  - A table view is always one click away, so nothing is reachable only by
 *    hovering.
 *
 * Time reads left-to-right even on this right-to-left page, so the plot is in
 * an LTR wrapper.
 */
const ACCENT = "#5d0089";
// Validated with the dataviz six-checks (light surface): all adjacent pairs pass CVD + normal-vision separation.
const CATEGORICAL = ["#7a2fb5", "#eb6834", "#1baf7a", "#2a78d6", "#e34948"];
const OTHER = "#a8a0ac";
const INK_MUTED = "#776a7a";
const GRID = "#ece2f1";

// The plot is drawn 1:1 in its container's pixels. Wide: a fixed 720×250 box scaled to fit;
// narrow (phones): the real container width, so axis text stays readable instead of shrinking with the SVG.
const WIDE_W = 720;
const COMPACT_BELOW = 520;

export interface TrendSeriesProp {
  name: string;
  values: number[];
  previous?: number[];
}
export interface Tab {
  label: string;
  href: string;
  active: boolean;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

function bucketText(b: string, unit: "day" | "week" | "month", long = false): string {
  const [y, m, d] = b.split("-");
  if (unit === "month") return `${y}-${m}`;
  if (unit === "week") return long ? `Week of ${y}-${m}-${d}` : `${m}/${d}`;
  return long ? `${y}-${m}-${d}` : `${m}/${d}`;
}

export function TrendCard({
  title,
  hint,
  format,
  buckets,
  unit,
  series,
  tabs,
  splitLabel,
  splitOptions,
  compare,
  note,
}: {
  title: string;
  hint?: string;
  format: ValueFormat;
  buckets: string[];
  unit: "day" | "week" | "month";
  series: TrendSeriesProp[];
  tabs: Tab[];
  splitLabel: string;
  splitOptions: Tab[];
  compare: boolean;
  note?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const plot = useRef<HTMLDivElement>(null);
  const tableId = useId();
  const [boxW, setBoxW] = useState(WIDE_W);
  const emptyChart = series.every((s) => s.values.every((v) => v === 0));
  useEffect(() => {
    const el = plot.current; // only mounted while there is data to draw
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBoxW(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [emptyChart]);
  const compact = boxW > 0 && boxW < COMPACT_BELOW;
  const W = compact ? Math.max(boxW, 200) : WIDE_W;
  const H = compact ? 230 : 250;
  const PAD = compact ? { l: 34, r: 40, t: 14, b: 26 } : { l: 52, r: 56, t: 14, b: 28 };

  const n = buckets.length;
  const multi = series.length > 1;
  const colors = useMemo(() => series.map((s, i) => (multi ? (s.name === "Other" || s.name === "Other" ? OTHER : CATEGORICAL[i % CATEGORICAL.length]) : ACCENT)), [series, multi]);
  const hasPrev = compare && series.some((s) => s.previous);
  const max = niceMax(Math.max(0, ...series.flatMap((s) => [...s.values, ...(compare ? (s.previous ?? []) : [])])));
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.t + plotH - (v / max) * plotH;
  const empty = series.every((s) => s.values.every((v) => v === 0));
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max];
  const xTickIdx = n <= 7 ? buckets.map((_, i) => i) : Array.from(new Set([0, 1, 2, 3, 4, 5].map((k) => Math.round((k / 5) * (n - 1)))));

  function indexFromPointer(clientX: number): number {
    const el = plot.current;
    if (!el || n === 0) return 0;
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W; // back into viewBox units
    const i = Math.round(((px - PAD.l) / plotW) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  // Direct end labels: only when 2–4 lines, and only those that do not collide.
  const endLabels = useMemo(() => {
    if (!multi || series.length > 4) return [] as { i: number; y: number }[];
    const items = series.map((s, i) => ({ i, y: y(s.values[n - 1] ?? 0) })).sort((a, b) => a.y - b.y);
    const kept: { i: number; y: number }[] = [];
    for (const it of items) if (kept.every((k) => Math.abs(k.y - it.y) >= 14)) kept.push(it);
    return kept;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- y() closes over max/plotH which derive from series
  }, [series, multi, n, max]);

  const hoverOnRight = hover !== null && n > 1 && hover / (n - 1) > 0.55;

  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-purple-900">{title}</h3>
          {hint && <p className="mt-0.5 max-w-[60ch] text-xs leading-relaxed text-secondary">{hint}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dropdown
            align="end"
            ariaLabel="Split lines"
            buttonClassName="press inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-strong bg-white px-3 text-xs font-medium text-body transition-colors hover:border-purple-600"
            label={<span>{splitLabel}</span>}
          >
            {splitOptions.map((o) => (
              <NavLink key={o.label} href={o.href} active={o.active} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-start text-sm transition-colors hover:bg-tint ${o.active ? "bg-purple-600/[0.07] font-semibold text-purple-900" : "text-body"}`}>
                {o.label}
              </NavLink>
            ))}
          </Dropdown>
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            aria-controls={tableId}
            className={`press inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${showTable ? "border-purple-600 bg-purple-600/[0.07] text-purple-900" : "border-border-strong bg-white text-body hover:border-purple-600"}`}
          >
            <Table size={14} />
            Table
          </button>
        </div>
      </div>

      {/* measure tabs */}
      <div role="tablist" aria-label="Chart measure" className="mt-4 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <NavLink
            key={t.label}
            href={t.href}
            role="tab"
            active={t.active}
            className={`press inline-flex min-h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${t.active ? "bg-purple-600 text-white" : "bg-tint text-body hover:bg-purple-600/10 hover:text-purple-900"}`}
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      {/* legend: always for ≥2 lines (or a previous-period overlay); a single line needs none — the title says what it is */}
      {(multi || hasPrev) && (
        <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-body">
          {series.map((s, i) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: colors[i] }} />
              <span dir="auto">{s.name}</span>
            </li>
          ))}
          {hasPrev && (
            <li className="flex items-center gap-1.5 text-secondary">
              <span aria-hidden className="w-4 border-t-2 border-dotted" style={{ borderColor: INK_MUTED }} />
              Previous period
            </li>
          )}
        </ul>
      )}

      {note && <p className="mt-3 rounded-lg bg-warning-bg px-3 py-2 text-xs text-warning">{note}</p>}

      {empty ? (
        <p className="py-16 text-center text-sm text-secondary">No data in this period with these filters.</p>
      ) : (
        <div
          ref={plot}
          dir="ltr"
          tabIndex={0}
          role="group"
          aria-label={`${title}. Use the left and right arrow keys to move between dates.`}
          className="relative mt-3 touch-pan-y rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-purple-600/30"
          onPointerMove={(e) => setHover(indexFromPointer(e.clientX))}
          onPointerDown={(e) => setHover(indexFromPointer(e.clientX))}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover((h) => h ?? n - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? n - 1) + 1));
            else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - 1));
            else if (e.key === "Escape") setHover(null);
            else return;
            e.preventDefault();
          }}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" role="img" aria-label={`${title} chart`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
                <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="11" fill={INK_MUTED}>
                  {formatTick(format, t)}
                </text>
              </g>
            ))}
            {xTickIdx.map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill={INK_MUTED}>
                {bucketText(buckets[i], unit)}
              </text>
            ))}

            {/* previous period — recessive, dotted, drawn first so current sits on top */}
            {hasPrev &&
              series.map((s, i) =>
                s.previous ? <polyline key={`p${i}`} fill="none" stroke={INK_MUTED} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" points={s.previous.map((v, k) => `${x(k)},${y(v)}`).join(" ")} /> : null,
              )}

            {series.map((s, i) => {
              const pts = s.values.map((v, k) => `${x(k)},${y(v)}`).join(" ");
              return (
                <g key={s.name}>
                  {!multi && n > 1 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}`} fill={colors[i]} fillOpacity="0.09" />}
                  <polyline fill="none" stroke={colors[i]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts} />
                </g>
              );
            })}

            {/* end dots with a 2px surface ring, and selective direct labels */}
            {series.map((s, i) => (
              <circle key={`e${i}`} cx={x(n - 1)} cy={y(s.values[n - 1] ?? 0)} r="4.5" fill={colors[i]} stroke="#fff" strokeWidth="2" />
            ))}
            {endLabels.map(({ i, y: ly }) => (
              <text key={`l${i}`} x={x(n - 1) + 10} y={ly + 3.5} fontSize="11" fill="#4a3a4e" fontWeight="600">
                {series[i].name.length > 8 ? `${series[i].name.slice(0, 7)}…` : series[i].name}
              </text>
            ))}

            {/* crosshair + the hovered points */}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} stroke={INK_MUTED} strokeOpacity="0.5" strokeWidth="1" />
                {series.map((s, i) => (
                  <circle key={`h${i}`} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="5" fill={colors[i]} stroke="#fff" strokeWidth="2" />
                ))}
              </g>
            )}
          </svg>

          {hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 min-w-[9rem] rounded-lg border border-border bg-white px-3 py-2 shadow-[0_8px_24px_-8px_rgba(36,20,38,0.25)]"
              style={hoverOnRight ? { right: `${(1 - x(hover) / W) * 100 + 2}%` } : { left: `${(x(hover) / W) * 100 + 2}%` }}
            >
              <p className="font-latin mb-1.5 text-[11px] text-secondary">{bucketText(buckets[hover], unit, true)}</p>
              <ul className="space-y-1">
                {series.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-secondary">
                      <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: colors[i] }} />
                      <span dir="auto" className="max-w-[7rem] truncate">
                        {multi ? s.name : title}
                      </span>
                    </span>
                    <span className="font-latin text-sm font-bold text-purple-900">{formatValue(format, s.values[hover] ?? 0)}</span>
                  </li>
                ))}
                {hasPrev && series[0]?.previous && (
                  <li className="flex items-center justify-between gap-4 border-t border-border pt-1 text-[11px] text-secondary">
                    <span>Previous period</span>
                    <span className="font-latin">{formatValue(format, series[0].previous[hover] ?? 0)}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {showTable && (
        <div id={tableId} className="mt-4 max-h-72 overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-tint">
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-start text-xs font-medium text-secondary">Date</th>
                {series.map((s) => (
                  <th key={s.name} className="px-3 py-2 text-start text-xs font-medium text-secondary">
                    <span dir="auto">{multi ? s.name : title}</span>
                  </th>
                ))}
                {hasPrev && <th className="px-3 py-2 text-start text-xs font-medium text-secondary">Previous period</th>}
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={b} className="border-b border-border last:border-0">
                  <td className="font-latin px-3 py-1.5 text-secondary">{bucketText(b, unit, true)}</td>
                  {series.map((s) => (
                    <td key={s.name} className="font-latin px-3 py-1.5 tabular-nums text-purple-900">
                      {formatValue(format, s.values[i] ?? 0)}
                    </td>
                  ))}
                  {hasPrev && <td className="font-latin px-3 py-1.5 tabular-nums text-secondary">{formatValue(format, series[0]?.previous?.[i] ?? 0)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
