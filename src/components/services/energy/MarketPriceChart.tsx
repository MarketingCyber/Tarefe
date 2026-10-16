"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { byLocale, type Locale } from "@/lib/taxonomy";
import { DEFAULT_PRESET, PRESETS, aggregate, statsFor, type Bucket, type Commodity, type MarketSeries, type Preset } from "@/lib/market-series";
import { MARKET_LABELS } from "@/lib/market-chart-labels";

/**
 * Live wholesale-price chart for the electricity and gas pages — it replaces the
 * schematic Preisgarantie sketch (PriceGuaranteeChart, which is still rendered
 * whenever the feed is unavailable, so the page never shows an empty box).
 *
 * Data: /api/market/{commodity} → one daily series in ct/kWh; the monthly /
 * weekly / daily views are averages computed here (lib/market-series.ts), so
 * switching never waits for the network. Default view: MONTHLY, last 24 months —
 * daily wholesale prices swing wildly with the weather, which makes a poor first
 * impression of "the market"; months show the trend and weekly / daily are one
 * tap away.
 *
 * Drawing: hand-rolled SVG at the container's real pixel width (text stays
 * readable on a phone), always left-to-right — time runs oldest → newest like
 * every price chart, inside an LTR island on the RTL page. The newest bucket is
 * drawn dashed when it is still filling up (month / week to date).
 *
 * Motion (GSAP, off under prefers-reduced-motion): the line draws itself once
 * when the data first arrives, the latest price counts up, and a preset switch
 * redraws the line in half a second. Hover/touch/keyboard feedback is instant —
 * those happen constantly and must never feel delayed.
 *
 * Not a tariff price: both feeds are wholesale prices without taxes, levies or
 * grid fees, and the subtitle says so (see lib/market-chart-labels.ts).
 */

const H = 196;
const PAD = { l: 40, r: 12, t: 12, b: 24 };
const BRAND = "#5d0089";
const GRID = "#ece2f1";
const INK = "#776a7a";
const YELLOW = "#f7c800";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const LOCALE_TAG: Record<Locale, { date: string; num: string }> = {
  fa: { date: "fa-IR-u-ca-gregory-nu-latn", num: "en-US" },
  de: { date: "de-DE", num: "de-DE" },
  ru: { date: "ru-RU", num: "de-DE" },
};

const MS_DAY = 86_400_000;
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
  const animated = useRef({ intro: false, preset: DEFAULT_PRESET as Preset });

  const [load, setLoad] = useState<Load>({ status: "idle" });
  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET);
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
  const buckets = useMemo(() => (series ? aggregate(series.points, preset) : []), [series, preset]);
  const stats = useMemo(() => (series ? statsFor(series.points, buckets) : null), [series, buckets]);

  const fmt = useMemo(() => new Intl.NumberFormat(tag.num, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [tag.num]);
  const fmt1 = useMemo(() => new Intl.NumberFormat(tag.num, { minimumFractionDigits: 0, maximumFractionDigits: 1 }), [tag.num]);
  const pct = useMemo(() => new Intl.NumberFormat(tag.num, { maximumFractionDigits: 0 }), [tag.num]);
  const dateFmt = useMemo(() => {
    const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(tag.date, { timeZone: "UTC", ...o });
    return {
      monthShort: f({ month: "short", year: "2-digit" }),
      monthLong: f({ month: "long", year: "numeric" }),
      dayShort: f({ day: "numeric", month: "short" }),
      dayLong: f({ weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      dayLongNoWeekday: f({ day: "numeric", month: "short", year: "numeric" }),
    };
  }, [tag.date]);

  const shortLabel = useCallback((b: Bucket) => (preset === "monthly" ? dateFmt.monthShort : dateFmt.dayShort).format(utc(b.start)), [preset, dateFmt]);
  const longLabel = useCallback(
    (b: Bucket) => {
      if (preset === "monthly") return dateFmt.monthLong.format(utc(b.start));
      if (preset === "weekly") return `${dateFmt.dayShort.format(utc(b.start))} – ${dateFmt.dayLongNoWeekday.format(utc(b.start) + 6 * MS_DAY)}`;
      return dateFmt.dayLong.format(utc(b.start));
    },
    [preset, dateFmt],
  );

  // ---- geometry
  const W = Math.max(width, 240);
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const geo = useMemo(() => {
    if (buckets.length === 0) return null;
    const vals = buckets.map((b) => b.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const ticks = niceTicks(lo - (hi - lo) * 0.06, hi + (hi - lo) * 0.06, 4);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const t0 = utc(buckets[0].start);
    const t1 = utc(buckets[buckets.length - 1].start);
    const x = (b: Bucket) => PAD.l + (t1 === t0 ? plotW / 2 : ((utc(b.start) - t0) / (t1 - t0)) * plotW);
    const y = (v: number) => PAD.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
    const pts = buckets.map((b) => ({ x: x(b), y: y(b.value) }));
    const last = buckets[buckets.length - 1];
    const dashed = last.partial && pts.length > 1;
    const solid = dashed ? pts.slice(0, -1) : pts;
    const line = (p: { x: number; y: number }[]) => p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
    const solidPath = line(solid);
    return {
      ticks,
      pts,
      y,
      solidPath,
      dashedPath: dashed ? line(pts.slice(-2)) : null,
      areaPath: `${line(pts)} L${pts[pts.length - 1].x.toFixed(1)} ${PAD.t + plotH} L${pts[0].x.toFixed(1)} ${PAD.t + plotH} Z`,
      xTicks: Array.from(new Set(Array.from({ length: W < 360 ? 4 : 5 }, (_, k) => Math.round((k / ((W < 360 ? 4 : 5) - 1)) * (buckets.length - 1))))),
    };
  }, [buckets, plotW, plotH, W]);

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

  const choosePreset = (p: Preset) => {
    setPreset(p);
    setHover(null);
  };

  // ---- GSAP: intro draw + count-up (once), quick redraw on preset change
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !geo || !stats?.latest) return;
    const first = !animated.current.intro;
    const presetChanged = animated.current.preset !== preset;
    animated.current = { intro: true, preset };
    const target = stats.latest.value;
    if (numRef.current && !first) numRef.current.textContent = fmt.format(target);
    if (!first && !presetChanged) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lines = root.querySelectorAll<SVGPathElement>("[data-draw]");
      const fades = root.querySelectorAll<SVGElement>("[data-fade]");
      const dur = first ? 1 : 0.5;
      gsap.fromTo(lines, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dur, ease: "power3.out", onComplete: () => gsap.set(lines, { clearProps: "strokeDasharray,strokeDashoffset" }) });
      gsap.fromTo(fades, { opacity: 0 }, { opacity: 1, duration: dur * 0.7, delay: dur * 0.35, ease: "power2.out", clearProps: "opacity" });
      if (first && numRef.current) {
        const obj = { v: 0 };
        const el = numRef.current;
        gsap.to(obj, { v: target, duration: 0.9, ease: "power3.out", onUpdate: () => (el.textContent = fmt.format(obj.v)), onComplete: () => (el.textContent = fmt.format(target)) });
      }
    });
    return () => mm.revert();
  }, [geo, preset, stats?.latest?.value]);

  if (load.status === "error") return <>{fallback}</>;

  const hb = hover !== null ? buckets[hover] : null;
  const prevOfHover = hover !== null && hover > 0 ? buckets[hover - 1] : null;
  const hoverChange = hb && prevOfHover && prevOfHover.value > 0 ? (hb.value - prevOfHover.value) / prevOfHover.value : null;
  const changeFrac = stats?.change ?? null;
  const rising = changeFrac !== null && changeFrac > 0.005;
  const falling = changeFrac !== null && changeFrac < -0.005;
  const title = byLocale(locale, L.title);
  const hoverX = hover !== null && geo ? geo.pts[hover].x : 0;

  return (
    <figure ref={rootRef} aria-labelledby={`${uid}-t`} className="mt-5 rounded-xl bg-white p-4">
      <figcaption>
        <p id={`${uid}-t`} className="text-sm font-bold text-purple-900">
          {title}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-secondary">{byLocale(locale, L.subtitle)}</p>
      </figcaption>

      {/* preset switch */}
      <div role="radiogroup" aria-label={title} className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-tint p-1">
        {PRESETS.map((p) => {
          const on = preset === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!ready}
              onClick={() => choosePreset(p)}
              className={`press min-h-9 rounded-full px-2 text-xs font-semibold transition-colors duration-150 disabled:opacity-60 ${on ? "bg-purple-900 text-white" : "text-secondary hover:text-purple-900"}`}
            >
              {byLocale(locale, L.presets[p])}
            </button>
          );
        })}
      </div>

      {/* headline numbers */}
      <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2">
        <div className="min-w-0">
          <dt className="text-[10px] font-medium leading-tight text-secondary">{byLocale(locale, L.latest)}</dt>
          <dd className="font-latin mt-1 text-xl font-bold leading-none tracking-tight text-purple-900 tabular-nums" dir="ltr">
            <span ref={numRef}>{stats?.latest ? fmt.format(stats.latest.value) : "—"}</span>
            <span className="ms-1 text-[10px] font-medium text-secondary">ct/kWh</span>
          </dd>
          <dd className="font-latin mt-1 text-[10px] text-secondary" dir="ltr">
            {stats?.latest ? dateFmt.dayLongNoWeekday.format(utc(stats.latest.date)) : " "}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-medium leading-tight text-secondary">{byLocale(locale, L.average)}</dt>
          <dd className="font-latin mt-1 text-xl font-bold leading-none tracking-tight text-purple-900 tabular-nums" dir="ltr">
            {stats && buckets.length ? fmt.format(stats.average) : "—"}
            <span className="ms-1 text-[10px] font-medium text-secondary">ct</span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-medium leading-tight text-secondary">{byLocale(locale, L.change)}</dt>
          <dd className={`font-latin mt-1 flex items-center gap-1 text-xl font-bold leading-none tracking-tight tabular-nums ${rising ? "text-danger" : falling ? "text-success" : "text-purple-900"}`} dir="ltr">
            {rising && <ArrowUp size={14} weight="bold" aria-hidden />}
            {falling && <ArrowDown size={14} weight="bold" aria-hidden />}
            {changeFrac === null ? "—" : `${changeFrac > 0 ? "+" : ""}${pct.format(changeFrac * 100)}%`}
          </dd>
          <dd className="mt-1 text-[10px] leading-tight text-secondary">{byLocale(locale, L.periodChange[preset])}</dd>
        </div>
      </dl>

      {/* plot */}
      <div
        ref={plotRef}
        dir="ltr"
        tabIndex={ready ? 0 : -1}
        role="group"
        aria-label={`${title} — ${byLocale(locale, L.unitName)}`}
        className="relative mt-3 touch-pan-y select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-purple-600/30"
        style={{ height: H }}
        onPointerMove={(e) => ready && setHover(indexAt(e.clientX))}
        onPointerDown={(e) => ready && setHover(indexAt(e.clientX))}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
      >
        {!ready || !geo ? (
          <div aria-hidden className="absolute inset-0 overflow-hidden rounded-lg">
            {[0.15, 0.4, 0.65, 0.9].map((f) => (
              <div key={f} className="absolute inset-x-0 border-t border-border" style={{ top: `${f * 100}%` }} />
            ))}
            <div className="absolute inset-x-0 bottom-0 top-1/3 animate-pulse bg-gradient-to-b from-purple-600/10 to-transparent [clip-path:polygon(0_60%,12%_45%,26%_55%,40%_25%,55%_40%,70%_15%,85%_30%,100%_10%,100%_100%,0_100%)]" />
            <span className="sr-only">{byLocale(locale, L.loading)}</span>
          </div>
        ) : (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden>
            <defs>
              <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={BRAND} stopOpacity="0.16" />
                <stop offset="1" stopColor={BRAND} stopOpacity="0" />
              </linearGradient>
            </defs>

            {geo.ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(t)} y2={geo.y(t)} stroke={GRID} strokeWidth="1" />
                <text x={PAD.l - 7} y={geo.y(t) + 3.5} textAnchor="end" fontSize="10" fill={INK} className="font-latin">
                  {fmt1.format(t)}
                </text>
              </g>
            ))}
            {geo.ticks[0] < 0 && geo.ticks[geo.ticks.length - 1] > 0 && <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(0)} y2={geo.y(0)} stroke={INK} strokeOpacity="0.45" strokeWidth="1" />}
            {geo.xTicks.map((i, k) => (
              <text key={i} x={geo.pts[i].x} y={H - 6} textAnchor={k === 0 ? "start" : k === geo.xTicks.length - 1 ? "end" : "middle"} fontSize="10" fill={INK} className="font-latin">
                {shortLabel(buckets[i])}
              </text>
            ))}

            <path d={geo.areaPath} fill={`url(#${uid}-area)`} data-fade />
            <path d={geo.solidPath} data-draw pathLength={1} fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {geo.dashedPath && <path d={geo.dashedPath} data-fade fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 6" />}

            {/* newest point: brand marker */}
            <circle cx={geo.pts[geo.pts.length - 1].x} cy={geo.pts[geo.pts.length - 1].y} r="5" fill={YELLOW} stroke={BRAND} strokeWidth="2" data-fade />

            {/* hover / focus */}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={hoverX} x2={hoverX} y1={PAD.t} y2={PAD.t + plotH} stroke={BRAND} strokeOpacity="0.35" strokeWidth="1" />
                <circle cx={hoverX} cy={geo.pts[hover].y} r="5" fill="#fff" stroke={BRAND} strokeWidth="2.5" />
              </g>
            )}
          </svg>
        )}

        {hb && geo && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-[8.5rem] rounded-lg border border-border bg-white px-3 py-2 shadow-[0_8px_24px_-8px_rgba(36,20,38,0.25)]"
            style={{ left: Math.min(Math.max(hoverX, 76), W - 76), transform: "translateX(-50%)" }}
          >
            <p className="text-[11px] text-secondary">
              {longLabel(hb)}
              {hb.partial && ` · ${byLocale(locale, L.toDate)}`}
            </p>
            <p className="font-latin mt-0.5 text-base font-bold leading-tight text-purple-900 tabular-nums">
              {fmt.format(hb.value)} <span className="text-[10px] font-medium text-secondary">ct/kWh</span>
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-secondary">
              {byLocale(locale, L.perPoint[preset])}
              {hoverChange !== null && (
                <span className="font-latin ms-1.5 tabular-nums" dir="ltr">
                  {hoverChange > 0 ? "▲ +" : hoverChange < 0 ? "▼ " : ""}
                  {pct.format(hoverChange * 100)}%
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* screen-reader equivalent of the chart + the hovered point */}
      <p className="sr-only" aria-live="polite">
        {hb ? `${longLabel(hb)}: ${fmt.format(hb.value)} ${byLocale(locale, L.unitName)}` : ""}
      </p>
      {ready && (
        <table className="sr-only">
          <caption>{`${title} — ${byLocale(locale, L.table)}`}</caption>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.start}>
                <th scope="row">{longLabel(b)}</th>
                <td>{`${fmt.format(b.value)} ct/kWh`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-secondary">
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
