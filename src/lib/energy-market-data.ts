import * as XLSX from "xlsx";
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
 * GAS — World Bank Commodity Price Data ("Pink Sheet"), series "Natural gas, Europe":
 * the Dutch TTF benchmark since April 2015 (the European reference the German THE
 * hub follows closely), monthly averages in USD per mmbtu, published in the first
 * days of each month for the month before. Converted with the ECB's monthly
 * USD-per-EUR reference rate: ct/kWh = USD/mmbtu ÷ 0.293071 (MWh per mmbtu) ÷ EURUSD ÷ 10.
 * No key. World Bank datasets are CC BY 4.0 by default; the chart credits both
 * the World Bank and the ECB. There is no free official German daily gas price
 * feed (EEX / Argus data is licensed), which is why gas is monthly — the chart
 * only ever shows monthly averages anyway. (OilPriceAPI was considered and dropped:
 * its terms grant no public-display rights over third-party data.)
 *
 * Both are WHOLESALE prices: no taxes, levies or grid fees — never a tariff
 * price. The chart says so.
 *
 * Caching: one in-memory copy per commodity (a page view never reaches the
 * upstream API), refreshed after a TTL; concurrent requests share one fetch;
 * if a refresh fails the last good copy keeps being served. The gas TTL is
 * long on purpose: the source only changes once a month.
 */

const BERLIN = "Europe/Berlin";
const HISTORY_DAYS = 760; // a little over 24 months, so the monthly view always has its full window
const TTL_MS: Record<Commodity, number> = { electricity: 30 * 60_000, gas: 12 * 3_600_000 };
const MIN_POINTS: Record<Commodity, number> = { electricity: 30, gas: 12 };
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
    readonly code: "upstream",
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

const MMBTU_PER_MWH_FACTOR = 0.293071; // MWh in one mmbtu
const WB_PAGE = "https://www.worldbank.org/en/research/commodity-markets";
// The file's URL contains a hash that changes with every monthly release, so it is read from the page; this one is the fallback.
const WB_FILE_FALLBACK = "https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx";

async function getBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 (compatible; TarefeBot/1.0)" } });
  if (!res.ok) throw new MarketDataError(`${new URL(url).host} responded ${res.status}`, "upstream");
  return Buffer.from(await res.arrayBuffer());
}

async function worldBankFileUrl(): Promise<string> {
  try {
    const html = (await getBuffer(WB_PAGE)).toString("utf8");
    const m = html.match(/https:\/\/thedocs\.worldbank\.org[^"'\s]*CMO-Historical-Data-Monthly\.xlsx/);
    if (m) return m[0];
  } catch {
    // fall through to the last known URL
  }
  return WB_FILE_FALLBACK;
}

/** Monthly "Natural gas, Europe" in USD per mmbtu, keyed "YYYY-MM". */
async function fetchWorldBankGas(): Promise<Map<string, number>> {
  const wb = XLSX.read(await getBuffer(await worldBankFileUrl()), { type: "buffer" });
  const sheet = wb.Sheets["Monthly Prices"];
  if (!sheet) throw new MarketDataError("World Bank file has no 'Monthly Prices' sheet", "upstream");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true });
  const hdr = rows.findIndex((r) => Array.isArray(r) && r.some((c) => typeof c === "string" && /^Natural gas, Europe/i.test(c)));
  if (hdr < 0) throw new MarketDataError("'Natural gas, Europe' not found in the World Bank file", "upstream");
  const col = (rows[hdr] as unknown[]).findIndex((c) => typeof c === "string" && /^Natural gas, Europe/i.test(c));
  // Guard the unit: the column header reads "Natural gas, Europe ($/mmbtu)"; refuse to convert anything else.
  if (!/mmbtu/i.test(String((rows[hdr] as unknown[])[col]) + String((rows[hdr + 1] as unknown[] | undefined)?.[col] ?? ""))) throw new MarketDataError("Unexpected unit in the World Bank gas column", "upstream");

  const out = new Map<string, number>();
  for (const r of rows.slice(hdr + 1) as unknown[][]) {
    const m = typeof r[0] === "string" ? r[0].match(/^(\d{4})M(\d{2})$/) : null;
    const v = Number(r[col]);
    if (m && Number.isFinite(v) && v > 0) out.set(`${m[1]}-${m[2]}`, v);
  }
  return out;
}

/** Monthly average USD per EUR from the ECB, keyed "YYYY-MM". */
async function fetchEurUsd(sinceMonth: string): Promise<Map<string, number>> {
  const text = (await getBuffer(`https://data-api.ecb.europa.eu/service/data/EXR/M.USD.EUR.SP00.A?format=csvdata&startPeriod=${sinceMonth}`)).toString("utf8");
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].split(",");
  const iT = head.indexOf("TIME_PERIOD");
  const iV = head.indexOf("OBS_VALUE");
  if (iT < 0 || iV < 0) throw new MarketDataError("Unexpected ECB response", "upstream");
  const out = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const v = Number(c[iV]);
    if (/^\d{4}-\d{2}$/.test(c[iT]) && Number.isFinite(v) && v > 0) out.set(c[iT], v);
  }
  return out;
}

async function fetchGas(): Promise<DailyPoint[]> {
  const today = berlinDate(Date.now());
  const since = addDays(today, -HISTORY_DAYS).slice(0, 7);
  const [gas, fx] = await Promise.all([fetchWorldBankGas(), fetchEurUsd(since)]);
  if (fx.size === 0) throw new MarketDataError("No ECB exchange rates", "upstream");
  const lastRate = fx.get([...fx.keys()].sort().at(-1)!)!;

  return [...gas.entries()]
    .filter(([ym]) => ym >= since)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([ym, usdPerMmbtu]) => {
      const eurusd = fx.get(ym) ?? lastRate; // the newest month can be missing from the ECB for a few days
      const ctPerKwh = usdPerMmbtu / MMBTU_PER_MWH_FACTOR / eurusd / 10;
      const y = +ym.slice(0, 4);
      const m = +ym.slice(5, 7);
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // dated the month's last day, so the chart treats the month as complete
      return [`${ym}-${String(lastDay).padStart(2, "0")}`, round3(ctPerKwh)] as const;
    });
}

// ------------------------------------------------------------------ caching

const SOURCE: Record<Commodity, MarketSeries["source"]> = {
  electricity: {
    name: "Energy-Charts (Fraunhofer ISE) · Bundesnetzagentur | SMARD.de",
    url: "https://www.energy-charts.info/charts/price_spot_market/chart.htm?l=de&c=DE",
    license: "CC BY 4.0",
  },
  gas: { name: "World Bank Commodity Price Data (TTF) · ECB exchange rate", url: "https://www.worldbank.org/en/research/commodity-markets", license: "CC BY 4.0" },
};

interface CacheEntry {
  series: MarketSeries;
  fetchedAt: number;
}
const cache = new Map<Commodity, CacheEntry>();
const inflight = new Map<Commodity, Promise<CacheEntry>>();

async function refresh(commodity: Commodity): Promise<CacheEntry> {
  const points = commodity === "electricity" ? await fetchElectricity() : await fetchGas();
  if (points.length < MIN_POINTS[commodity]) throw new MarketDataError("Upstream returned too little data", "upstream");
  const entry: CacheEntry = { series: { commodity, unit: "ct/kWh", granularity: commodity === "gas" ? "monthly" : "daily", source: SOURCE[commodity], updatedAt: new Date().toISOString(), points }, fetchedAt: Date.now() };
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
