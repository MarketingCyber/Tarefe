import type { Commodity, DailyPoint, MarketSeries } from "@/lib/market-series";

/**
 * Wholesale price feeds for the electricity and gas pages' live chart.
 *
 * ELECTRICITY — Energy-Charts API (Fraunhofer ISE), the German/Luxembourg
 * day-ahead auction price (bidding zone DE-LU). Free, no key, CC BY 4.0 with
 * attribution to "Bundesnetzagentur | SMARD.de" (shown under the chart).
 * Hourly values until Sept 2025, 15-minute values after; both are averaged to
 * one value per Berlin calendar day. EUR/MWh ÷ 10 = ct/kWh.
 *
 * GAS — OilPriceAPI, code DUTCH_TTF_EUR (TTF, the European benchmark the German
 * THE hub tracks closely), EUR/MWh ÷ 10 = ct/kWh. Needs OILPRICEAPI_KEY in the
 * server environment; without it the gas feed reports "not configured" and the
 * page keeps showing its schematic chart. There is no free official German gas
 * price API, which is why this one is a licensed third-party feed.
 *
 * Both are WHOLESALE prices: no taxes, levies or grid fees — never a tariff
 * price. The chart says so.
 *
 * Caching: one in-memory copy per commodity (a page view never reaches the
 * upstream API), refreshed after a TTL; concurrent requests share one fetch;
 * if a refresh fails the last good copy keeps being served. The gas TTL is
 * deliberately long: OilPriceAPI's free plan is quota-limited (50 requests per
 * day at the time of writing) and a day-old TTF close is plenty for a trend chart.
 */

const BERLIN = "Europe/Berlin";
const HISTORY_DAYS = 760; // a little over 24 months, so the monthly view always has its full window
const TTL_MS: Record<Commodity, number> = { electricity: 30 * 60_000, gas: 6 * 3_600_000 };
const FETCH_TIMEOUT_MS = 20_000;

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: BERLIN, year: "numeric", month: "2-digit", day: "2-digit" });
const berlinDate = (ms: number) => dayFmt.format(new Date(ms));
// 50k+ quarter-hour values land in ~18k distinct hours: format each hour once.
const hourCache = new Map<number, string>();
function berlinDateOfSeconds(sec: number): string {
  const hour = sec - (sec % 3600);
  let d = hourCache.get(hour);
  if (!d) {
    d = berlinDate(hour * 1000);
    hourCache.set(hour, d);
  }
  return d;
}
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const round3 = (v: number) => Math.round(v * 1000) / 1000;

export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "upstream",
  ) {
    super(message);
  }
}

async function getJson(url: string, init: RequestInit = {}): Promise<{ json: unknown; headers: Headers }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store", headers: { Accept: "application/json", ...init.headers } });
  if (!res.ok) throw new MarketDataError(`${new URL(url).host} responded ${res.status}`, "upstream");
  return { json: await res.json(), headers: res.headers };
}

// ------------------------------------------------------------------ electricity

async function fetchElectricity(): Promise<DailyPoint[]> {
  const today = berlinDate(Date.now());
  const start = addDays(today, -HISTORY_DAYS);
  const { json } = await getJson(`https://api.energy-charts.info/price?bzn=DE-LU&start=${start}&end=${addDays(today, 1)}`);
  const o = json as { unix_seconds?: number[]; price?: (number | null)[]; unit?: string };
  if (!Array.isArray(o.unix_seconds) || !Array.isArray(o.price) || o.unix_seconds.length !== o.price.length) throw new MarketDataError("Unexpected Energy-Charts response", "upstream");
  if (o.unit && !/EUR\s*\/\s*MWh/i.test(o.unit)) throw new MarketDataError(`Unexpected unit ${o.unit}`, "upstream");

  const sums = new Map<string, { sum: number; n: number }>();
  for (let i = 0; i < o.unix_seconds.length; i++) {
    const v = o.price[i];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const d = berlinDateOfSeconds(o.unix_seconds[i]);
    if (d > today) continue; // tomorrow's auction result is published early; the chart is "up to today"
    const s = sums.get(d);
    if (s) {
      s.sum += v;
      s.n += 1;
    } else sums.set(d, { sum: v, n: 1 });
  }
  return [...sums.entries()]
    .filter(([, s]) => s.n >= 8) // a day with a handful of values is a gap, not a price
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([d, s]) => [d, round3(s.sum / s.n / 10)] as const);
}

// ------------------------------------------------------------------------ gas

interface OilPriceRow {
  price?: number | string;
  observed_at?: string;
  source_date?: string;
  created_at?: string;
}

async function fetchGas(): Promise<DailyPoint[]> {
  const key = process.env.OILPRICEAPI_KEY;
  if (!key) throw new MarketDataError("OILPRICEAPI_KEY is not set", "not_configured");

  const today = berlinDate(Date.now());
  const base = `https://api.oilpriceapi.com/v1/prices/historical?by_code=DUTCH_TTF_EUR&interval=daily&per_page=500&start_date=${addDays(today, -HISTORY_DAYS)}&end_date=${today}`;
  const headers = { Authorization: `Token ${key}` };

  const rows: OilPriceRow[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { json, headers: h } = await getJson(`${base}&page=${page}`, { headers });
    const data = (json as { data?: { prices?: OilPriceRow[] } }).data;
    if (!data || !Array.isArray(data.prices)) throw new MarketDataError("Unexpected OilPriceAPI response", "upstream");
    rows.push(...data.prices);
    totalPages = Math.min(5, Number(h.get("x-total-pages")) || 1);
    page += 1;
  } while (page <= totalPages);

  // One value per Berlin day (the latest observation of that day wins), EUR/MWh ÷ 10 = ct/kWh.
  const byDay = new Map<string, { at: string; v: number }>();
  for (const r of rows) {
    const stamp = r.observed_at ?? r.source_date ?? r.created_at;
    const price = Number(r.price);
    if (!stamp || !Number.isFinite(price) || price <= 0) continue;
    const ms = Date.parse(stamp.length === 10 ? `${stamp}T12:00:00Z` : stamp);
    if (Number.isNaN(ms)) continue;
    const d = berlinDate(ms);
    const prev = byDay.get(d);
    if (!prev || stamp > prev.at) byDay.set(d, { at: stamp, v: price });
  }
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, x]) => [d, round3(x.v / 10)] as const);
}

// ------------------------------------------------------------------ caching

const SOURCE: Record<Commodity, MarketSeries["source"]> = {
  electricity: {
    name: "Energy-Charts (Fraunhofer ISE) · Bundesnetzagentur | SMARD.de",
    url: "https://www.energy-charts.info/charts/price_spot_market/chart.htm?l=de&c=DE",
    license: "CC BY 4.0",
  },
  gas: { name: "OilPriceAPI · TTF", url: "https://www.oilpriceapi.com/" },
};

interface CacheEntry {
  series: MarketSeries;
  fetchedAt: number;
}
const cache = new Map<Commodity, CacheEntry>();
const inflight = new Map<Commodity, Promise<CacheEntry>>();

async function refresh(commodity: Commodity): Promise<CacheEntry> {
  const points = commodity === "electricity" ? await fetchElectricity() : await fetchGas();
  if (points.length < 30) throw new MarketDataError("Upstream returned too little data", "upstream");
  const entry: CacheEntry = { series: { commodity, unit: "ct/kWh", source: SOURCE[commodity], updatedAt: new Date().toISOString(), points }, fetchedAt: Date.now() };
  cache.set(commodity, entry);
  return entry;
}

/**
 * The daily series for a commodity. Fresh copy from memory when young enough;
 * otherwise one shared refresh; if that fails, the previous copy (however old)
 * rather than an error. Throws MarketDataError only when there is nothing to serve.
 */
export async function getMarketSeries(commodity: Commodity): Promise<MarketSeries> {
  const hit = cache.get(commodity);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS[commodity]) return hit.series;

  let p = inflight.get(commodity);
  if (!p) {
    p = refresh(commodity).finally(() => inflight.delete(commodity));
    inflight.set(commodity, p);
  }
  try {
    return (await p).series;
  } catch (err) {
    if (hit) {
      // Serve the stale copy, and back off so a broken upstream is not hammered on every request.
      hit.fetchedAt = Date.now() - TTL_MS[commodity] + 5 * 60_000;
      return hit.series;
    }
    throw err;
  }
}
