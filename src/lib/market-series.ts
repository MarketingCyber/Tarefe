/**
 * Wholesale energy price series — shared by the server (lib/energy-market-data.ts
 * builds it) and the browser chart (MarketPriceChart.tsx aggregates and draws it).
 * Pure functions only: no I/O, no DOM.
 *
 * The server delivers ONE daily series per commodity in ct/kWh; weekly and
 * monthly views are averages of those days, computed here, so switching the
 * chart's preset never needs another request.
 */

export type Commodity = "electricity" | "gas";

/** [Berlin calendar date "YYYY-MM-DD", price in ct/kWh] */
export type DailyPoint = readonly [date: string, value: number];

export interface MarketSeries {
  commodity: Commodity;
  unit: "ct/kWh";
  source: { name: string; url: string; license?: string };
  /** When the server last fetched the upstream API (ISO). */
  updatedAt: string;
  points: DailyPoint[];
}

export type Preset = "monthly" | "weekly" | "daily";
export const PRESETS: readonly Preset[] = ["monthly", "weekly", "daily"];
export const DEFAULT_PRESET: Preset = "monthly";

/** How much history each preset shows. Monthly: 24 months; weekly: 52 weeks; daily: 90 days. */
const WINDOW: Record<Preset, number> = { monthly: 24, weekly: 52, daily: 90 };

export interface Bucket {
  /** Start date of the bucket (YYYY-MM-DD): the day itself, the Monday of the week, or the 1st of the month. */
  start: string;
  /** Last date that has data in this bucket. */
  end: string;
  value: number;
  /** Number of daily values averaged. */
  days: number;
  /** The newest bucket is still filling up (month / week to date). Always false for daily. */
  partial: boolean;
}

const MS_DAY = 86_400_000;
const parse = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function weekStart(d: string): string {
  const ms = parse(d);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // Monday = 0
  return iso(ms - dow * MS_DAY);
}

function bucketKey(d: string, preset: Preset): string {
  if (preset === "daily") return d;
  if (preset === "weekly") return weekStart(d);
  return `${d.slice(0, 7)}-01`;
}

/** Last N bucket starts up to and including the bucket of `lastDate`, oldest first. */
function windowStarts(lastDate: string, preset: Preset, size?: number): string[] {
  const n = size ?? WINDOW[preset];
  const out: string[] = [];
  if (preset === "monthly") {
    let y = +lastDate.slice(0, 4);
    let m = +lastDate.slice(5, 7);
    for (let i = 0; i < n; i++) {
      out.unshift(`${y}-${String(m).padStart(2, "0")}-01`);
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    }
  } else if (preset === "weekly") {
    const last = parse(weekStart(lastDate));
    for (let i = 0; i < n; i++) out.unshift(iso(last - i * 7 * MS_DAY));
  } else {
    const last = parse(lastDate);
    for (let i = 0; i < n; i++) out.unshift(iso(last - i * MS_DAY));
  }
  return out;
}

/** Aggregate the daily series into the preset's buckets. Buckets with no data are left out (never drawn as zero). */
export function aggregate(points: readonly DailyPoint[], preset: Preset, windowSize?: number): Bucket[] {
  if (points.length === 0) return [];
  const lastDate = points[points.length - 1][0];
  const keep = new Set(windowStarts(lastDate, preset, windowSize));
  const map = new Map<string, { sum: number; n: number; end: string }>();
  for (const [date, value] of points) {
    const k = bucketKey(date, preset);
    if (!keep.has(k)) continue;
    const b = map.get(k);
    if (b) {
      b.sum += value;
      b.n += 1;
      if (date > b.end) b.end = date;
    } else map.set(k, { sum: value, n: 1, end: date });
  }
  const lastKey = bucketKey(lastDate, preset);
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([start, b]) => ({ start, end: b.end, value: b.sum / b.n, days: b.n, partial: preset !== "daily" && start === lastKey && !isCompleteBucket(start, b.end, preset) }));
}

/** A bucket is complete when its last day with data is the last calendar day of that month / week. */
function isCompleteBucket(start: string, end: string, preset: Preset): boolean {
  if (preset === "weekly") return parse(end) - parse(start) >= 6 * MS_DAY;
  const y = +start.slice(0, 4);
  const m = +start.slice(5, 7);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return +end.slice(8, 10) >= daysInMonth;
}

export interface WindowStats {
  latest: { date: string; value: number } | null;
  average: number;
  min: Bucket | null;
  max: Bucket | null;
  /** Relative change from the first to the last bucket, as a fraction (0.12 = +12%). null when the start is ≤ 0 or there are fewer than 2 buckets. */
  change: number | null;
}

export function statsFor(points: readonly DailyPoint[], buckets: readonly Bucket[]): WindowStats {
  const lastPoint = points[points.length - 1];
  const latest = lastPoint ? { date: lastPoint[0], value: lastPoint[1] } : null;
  if (buckets.length === 0) return { latest, average: 0, min: null, max: null, change: null };
  let min = buckets[0];
  let max = buckets[0];
  let sum = 0;
  let days = 0;
  for (const b of buckets) {
    sum += b.value * b.days; // weighted by days, so a 3-day partial month does not count like a full one
    days += b.days;
    if (b.value < min.value) min = b;
    if (b.value > max.value) max = b;
  }
  const first = buckets[0].value;
  const last = buckets[buckets.length - 1].value;
  return { latest, average: sum / days, min, max, change: buckets.length > 1 && first > 0 ? (last - first) / first : null };
}
