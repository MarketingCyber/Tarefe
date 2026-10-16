"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowDown, ArrowUp, LockKey } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import { aggregate, type Bucket, type Commodity, type MarketSeries } from "@/lib/market-series";
import { MARKET_LABELS } from "@/lib/market-chart-labels";

/**
 * Live wholesale-price chart for the electricity and gas pages — it replaces the
 * schematic Preisgarantie sketch (PriceGuaranteeChart, still rendered whenever
 * the feed is unavailable, so the page never shows an empty box).
 *
 * What it is for: show that market prices have risen, and tie that to the
 * Preisgarantie — "your price stays fixed until the end of the contract, even if
 * prices rise further". So it is deliberately small: a headline computed from the
 * data ("up X% in the last 12 months" — only when the data really shows a rise,
 * otherwise a neutral line), two numbers (current price, change from last month),
 * ONE chart (13 months of monthly averages, unit written on the chart) and the
 * guarantee sentence. The guarantee sentence is conditional ("even if"), never a
 * forecast.
 *
 * Data: /api/market/{commodity} → one daily series in ct/kWh (lib/energy-market-data.ts);
 * monthly averages are computed here (lib/market-series.ts).
 *
 * Drawing: hand-rolled SVG at the container's real pixel width, always
 * left-to-right (oldest → newest, like every price chart) inside an LTR island on
 * the RTL page. The newest month is drawn dashed while it is still filling up.
 *
 * Motion (GSAP, off under prefers-reduced-motion): the line draws itself once when
 * the data first arrives and the current price counts up. Hover / touch / keyboard
 * feedback is instant — those happen constantly and must never feel delayed.
 *
 * Not a tariff price: both feeds are wholesale prices without taxes, levies or
 * grid fees, and the subtitle says so (lib/market-chart-labels.ts).
 */

// 13 monthly points = the same month a year ago → now, so "12-month change" is exact.
const MONTHS = 13;
const RISE_THRESHOLD = 0.03; // below this the headline stays neutral instead of claiming a rise
const H = 190;
const PAD = { l: 34, r: 14, t: 26, b: 24 };
const BRAND = "#5d0089";
const GRID = "#ece2f1";
const INK = "#776a7a";
const YELLOW = "#f7c800";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// fa uses Persian digits in DATES and in the headline sentence (like the surrounding prose); every price stays in Latin digits.
const LOCALE_TAG: Record<Locale, { date: string; num: string; prose: string }> = {
  fa: { date: "fa-IR-u-ca-gregory", num: "en-US", prose: "fa-IR" },
  de: { date: "de-DE", num: "de-DE", prose: "de-DE" },
  ru: { date: "ru-RU", num: "de-DE", prose: "ru-RU" },
};

const utc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

/** "Nice" axis ticks covering [min, max] with roughly `count` steps. */
function niceTicks(min: number, max: number, count: number): number[] {
  if (!(max > min)) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

type Load = { status: "idle" } | { status: "loading" } | { status: "ready"; series: MarketSeries } | { status: "error" };

export function MarketPriceChart({ commodity, locale, fallback }: { commodity: Commodity; locale: Locale; fallback: React.ReactNode }) {
  const L = MARKET_LABELS[commodity];
  const tag = LOCALE_TAG[locale];
  const uid = useId();

  const rootRef = useRef<HTMLElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const introDone = useRef(false);

  const [load, setLoad] = useState<Load>({ status: "idle" });
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  // ---- fetch once, when the chart is about to be seen
  useEffect(() => {
    const el = rootRef.current;
    if (!el || load.status !== "idle") return;
    const start = () => {
      setLoad({ status: "loading" });
      fetch(`/api/market/${commodity}`)
        .then((r) => (r.ok ? (r.json() as Promise<MarketSeries>) : Promise.reject(new Error(String(r.status)))))
        .then((series) => setLoad(series.points?.length ? { status: "ready", series } : { status: "error" }))
        .catch(() => setLoad({ status: "error" }));
    };
    if (typeof IntersectionObserver === "undefined") return start();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [commodity, load.status]);

  // ---- measure the plot so the SVG is drawn 1:1 in CSS pixels
  const ready = load.status === "ready";
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const series = ready ? load.series : null;
  const buckets = useMemo(() => (series ? aggregate(series.points, "monthly", MONTHS) : []), [series]);
  const latest = series ? series.points[series.points.length - 1] : null;
  const wholeMonths = series?.granularity === "monthly"; // gas: the newest point is a complete month average, not a day
  // Change from last month: the newest month (so far) against the one before it.
  const monthChange = useMemo(() => {
    if (buckets.length < 2) return null;
    const cur = buckets[buckets.length - 1].value;
    const prev = buckets[buckets.length - 2].value;
    return prev > 0 ? (cur - prev) / prev : null;
  }, [buckets]);
  // Change over the whole window: the same month a year ago → now (needs a full 13 months).
  const yearChange = useMemo(() => {
    if (buckets.length < MONTHS) return null;
    const first = buckets[0].value;
    return first > 0 ? (buckets[buckets.length - 1].value - first) / first : null;
  }, [buckets]);

  const fmt = useMemo(() => new Intl.NumberFormat(tag.num, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [tag.num]);
  const fmtAxis = useMemo(() => new Intl.NumberFormat(tag.num, { minimumFractionDigits: 0, maximumFractionDigits: 1 }), [tag.num]);
  const pct = useMemo(() => new Intl.NumberFormat(tag.num, { maximumFractionDigits: 0 }), [tag.num]);
  const pctProse = useMemo(() => new Intl.NumberFormat(tag.prose, { maximumFractionDigits: 0 }), [tag.prose]);
  const dateFmt = useMemo(() => {
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag.date, { timeZone: "UTC", ...o });
    return { monthShort: f({ month: "short", year: "2-digit" }), monthLong: f({ month: "long", year: "numeric" }), day: f({ day: "numeric", month: "short", year: "numeric" }) };
  }, [tag.date]);

  // ---- geometry
  const W = Math.max(width, 240);
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const geo = useMemo(() => {
    if (buckets.length === 0) return null;
    const vals = buckets.map((b) => b.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const ticks = niceTicks(lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.08, 3);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const t0 = utc(buckets[0].start);
    const t1 = utc(buckets[buckets.length - 1].start);
    const x = (b: Bucket) => PAD.l + (t1 === t0 ? plotW / 2 : ((utc(b.start) - t0) / (t1 - t0)) * plotW);
    const y = (v: number) => PAD.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    const pts = buckets.map((b) => ({ x: x(b), y: y(b.value) }));
    const dashed = buckets[buckets.length - 1].partial && pts.length > 1;
    const line = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
    // A label every 4 months, counted back from today: enough to orient, never crowded.
    const xTicks = buckets.map((_, i) => i).filter((i) => (buckets.length - 1 - i) % 4 === 0);
    return {
      ticks,
      pts,
      y,
      solidPath: line(dashed ? pts.slice(0, -1) : pts),
      dashedPath: dashed ? line(pts.slice(-2)) : null,
      areaPath: `${line(pts)} L${pts[pts.length - 1].x.toFixed(1)} ${PAD.t + plotH} L${pts[0].x.toFixed(1)} ${PAD.t + plotH} Z`,
      xTicks,
    };
  }, [buckets, plotW, plotH]);

  // ---- interaction
  const indexAt = (clientX: number) => {
    const el = plotRef.current;
    if (!el || !geo) return null;
    const px = clientX - el.getBoundingClientRect().left;
    let best = 0;
    let dist = Infinity;
    geo.pts.forEach((p, i) => {
      const d = Math.abs(p.x - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const n = buckets.length;
    if (!n) return;
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? n - 2) + 1));
    else if (e.key === "Home") setHover(0);
    else if (e.key === "End") setHover(n - 1);
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  // ---- GSAP: the line draws itself once, the current price counts up
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !geo || !latest || introDone.current) return;
    introDone.current = true;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lines = root.querySelectorAll<SVGPathElement>("[data-draw]");
      const fades = root.querySelectorAll<SVGElement>("[data-fade]");
      gsap.fromTo(lines, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: "power3.out", onComplete: () => gsap.set(lines, { clearProps: "strokeDasharray,strokeDashoffset" }) });
      gsap.fromTo(fades, { opacity: 0 }, { opacity: 1, duration: 0.7, delay: 0.35, ease: "power2.out", clearProps: "opacity" });
      const el = numRef.current;
      if (el) {
        const obj = { v: 0 };
        gsap.to(obj, { v: latest[1], duration: 0.9, ease: "power3.out", onUpdate: () => (el.textContent = fmt.format(obj.v)), onComplete: () => (el.textContent = fmt.format(latest[1])) });
      }
    });
    return () => mm.revert();
  }, [geo, latest]);

  if (load.status === "error") return <>{fallback}</>;

  const hb = hover !== null ? buckets[hover] : null;
  const rising = monthChange !== null && monthChange > 0.005;
  const falling = monthChange !== null && monthChange < -0.005;
  const title = byLocale(locale, L.title);
  const hoverX = hover !== null && geo ? geo.pts[hover].x : 0;
  const labelOf = (b: Bucket) => dateFmt.monthLong.format(utc(b.start));
  const headline = yearChange !== null && yearChange >= RISE_THRESHOLD ? byLocale(locale, L.risen).replace("{p}", pctProse.format(yearChange * 100)) : byLocale(locale, L.swings);

  return (
    <figure ref={rootRef} aria-labelledby={`${uid}-t`} className="mt-5 rounded-xl bg-white p-4">
      <figcaption>
        <p id={`${uid}-t`} className="text-xs font-medium text-secondary">
          {title}
        </p>
        <p className="mt-1 text-base font-bold leading-snug text-purple-900">{headline}</p>
      </figcaption>

      {/* the two numbers that matter */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4">
        <div className="min-w-0">
          <dt className="text-xs font-medium text-secondary">{byLocale(locale, wholeMonths ? L.latestMonthly : L.latest)}</dt>
          <dd className="font-latin mt-1 flex items-baseline gap-1.5 leading-none text-purple-900 tabular-nums" dir="ltr">
            <span ref={numRef} className="text-3xl font-bold tracking-tight">
              {latest ? fmt.format(latest[1]) : "—"}
            </span>
            <span className="text-xs font-medium text-secondary">ct/kWh</span>
          </dd>
          <dd className="mt-1.5 text-[11px] text-secondary">{latest ? (wholeMonths ? dateFmt.monthLong : dateFmt.day).format(utc(latest[0])) : " "}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium text-secondary">{byLocale(locale, L.monthlyChange)}</dt>
          <dd className={`font-latin mt-1 flex items-center gap-1 text-3xl font-bold leading-none tracking-tight tabular-nums ${rising ? "text-danger" : falling ? "text-success" : "text-purple-900"}`} dir="ltr">
            {rising && <ArrowUp size={20} weight="bold" aria-hidden />}
            {falling && <ArrowDown size={20} weight="bold" aria-hidden />}
            {monthChange === null ? "—" : `${monthChange > 0 ? "+" : ""}${pct.format(monthChange * 100)}%`}
          </dd>
          <dd className="mt-1.5 text-[11px] leading-snug text-secondary">{byLocale(locale, wholeMonths ? L.monthlyChangeNoteFull : L.monthlyChangeNote)}</dd>
        </div>
      </dl>

      {/* plot */}
      <div
        ref={plotRef}
        dir="ltr"
        tabIndex={ready ? 0 : -1}
        role="group"
        aria-label={`${title} — ${byLocale(locale, L.unitName)}`}
        className="relative mt-4 touch-pan-y select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-purple-600/30"
        style={{ height: H }}
        onPointerMove={(e) => ready && setHover(indexAt(e.clientX))}
        onPointerDown={(e) => ready && setHover(indexAt(e.clientX))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
      >
        {!ready || !geo ? (
          <div aria-hidden className="absolute inset-0 overflow-hidden rounded-lg">
            {[0.2, 0.5, 0.8].map((f) => (
              <div key={f} className="absolute inset-x-0 border-t border-border" style={{ top: `${f * 100}%` }} />
            ))}
            <div className="absolute inset-x-0 bottom-0 top-1/3 animate-pulse bg-gradient-to-b from-purple-600/10 to-transparent [clip-path:polygon(0_60%,12%_45%,26%_55%,40%_25%,55%_40%,70%_15%,85%_30%,100%_10%,100%_100%,0_100%)]" />
            <span className="sr-only">{byLocale(locale, L.loading)}</span>
          </div>
        ) : (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden>
            <defs>
              <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={BRAND} stopOpacity="0.14" />
                <stop offset="1" stopColor={BRAND} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* the unit, written on the chart */}
            <text x={0} y={11} fontSize="12" fontWeight="600" fill={INK} className="font-latin">
              ct/kWh
            </text>

            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(t)} y2={geo.y(t)} stroke={GRID} strokeWidth="1" />
                <text x={PAD.l - 8} y={geo.y(t) + 4} textAnchor="end" fontSize="12" fill={INK} className="font-latin">
                  {fmtAxis.format(t)}
                </text>
              </g>
            ))}
            {geo.xTicks.map((i, k) => (
              <text key={i} x={geo.pts[i].x} y={H - 6} textAnchor={k === 0 ? "start" : k === geo.xTicks.length - 1 ? "end" : "middle"} fontSize="12" fill={INK} className="font-latin">
                {dateFmt.monthShort.format(utc(buckets[i].start))}
              </text>
            ))}

            <path d={geo.areaPath} fill={`url(#${uid}-area)`} data-fade />
            <path d={geo.solidPath} data-draw pathLength={1} fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {geo.dashedPath && <path d={geo.dashedPath} data-fade fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 6" />}

            {/* one small dot per month, so it is clear each point is a month */}
            <g data-fade>
              {geo.pts.slice(0, -1).map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke={BRAND} strokeWidth="1.75" />
              ))}
            </g>
            <circle cx={geo.pts[geo.pts.length - 1].x} cy={geo.pts[geo.pts.length - 1].y} r="5.5" fill={YELLOW} stroke={BRAND} strokeWidth="2" data-fade />

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={hoverX} x2={hoverX} y1={PAD.t} y2={PAD.t + plotH} stroke={BRAND} strokeOpacity="0.35" strokeWidth="1" />
                <circle cx={hoverX} cy={geo.pts[hover].y} r="5.5" fill="#fff" stroke={BRAND} strokeWidth="2.5" />
              </g>
            )}
          </svg>
        )}

        {hb && geo && (
          <div className="pointer-events-none absolute top-0 z-10 min-w-[8.5rem] rounded-lg border border-border bg-white px-3 py-2 shadow-[0_8px_24px_-8px_rgba(36,20,38,0.25)]" style={{ left: Math.min(Math.max(hoverX, 76), W - 76), transform: "translateX(-50%)" }}>
            <p className="text-xs text-secondary">
              {labelOf(hb)}
              {hb.partial && ` · ${byLocale(locale, L.toDate)}`}
            </p>
            <p className="font-latin mt-0.5 text-base font-bold leading-tight text-purple-900 tabular-nums">
              {fmt.format(hb.value)} <span className="text-xs font-medium text-secondary">ct/kWh</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-secondary">{byLocale(locale, L.monthAverage)}</p>
          </div>
        )}
      </div>

      {/* the point of the section */}
      <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-purple-600/[0.07] px-3 py-2.5 text-sm font-semibold leading-snug text-purple-900">
        <LockKey size={18} weight="fill" className="mt-0.5 shrink-0 text-purple-600" aria-hidden />
        <span>{byLocale(locale, L.guarantee)}</span>
      </p>

      <p className="mt-3 text-[11px] leading-relaxed text-secondary">{byLocale(locale, L.subtitle)}</p>

      {/* screen-reader equivalent of the chart + the hovered point */}
      <p className="sr-only" aria-live="polite">
        {hb ? `${labelOf(hb)}: ${fmt.format(hb.value)} ${byLocale(locale, L.unitName)}` : ""}
      </p>
      {ready && (
        <table className="sr-only">
          <caption>{`${title} — ${byLocale(locale, L.table)}`}</caption>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.start}>
                <th scope="row">{labelOf(b)}</th>
                <td>{`${fmt.format(b.value)} ct/kWh`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-secondary">
        {byLocale(locale, L.sourceLead)}:{" "}
        {series ? (
          <a href={series.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-purple-600">
            {series.source.name}
          </a>
        ) : (
          "…"
        )}
        {series?.source.license ? ` · ${series.source.license}` : ""}
      </p>
    </figure>
  );
}
