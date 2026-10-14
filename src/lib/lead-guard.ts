import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Anti-abuse layers for the public lead endpoint (/api/leads).
 *
 * Why this exists (2026-10-14): from 2026-10-12 a bot posted ~40 fake leads
 * straight to the API — random "names", 10-digit phone numbers, scraped
 * real e-mail addresses, one request per source IP (mostly Tor exit nodes,
 * so the per-IP rate limit never fired) and a browser name wrapped in
 * literal quote characters, which no real browser sends. Every fake also
 * synced to the Dynamics CRM. The layers below are cheap, free of third
 * parties, and each stops a different kind of low-effort bot. They are NOT
 * a substitute for a CAPTCHA against a determined attacker — Cloudflare
 * Turnstile is the next step (needs a site key; see the route's comment).
 *
 *  1. isBotUserAgent   — empty / scripted / quote-wrapped / ancient UA.
 *  2. form token       — signed, single-use, minimum age. The real form
 *                        fetches one on load (GET /api/leads/token); a bot
 *                        POSTing straight at the API has none.
 *  3. honeypot field   — checked in the route (a hidden input humans never
 *                        see, form-filling bots do).
 *  4. isTorExit        — Tor exit nodes, from the Tor Project's own list.
 *
 * Process-local state (used tokens, the Tor list) is fine for the single
 * PM2 instance this runs on — same caveat as rate-limit.ts.
 */

// ---------------------------------------------------------------- 1. UA

const SCRIPTED_UA = /(curl|wget|python-requests|python-urllib|aiohttp|httpx|axios|node-fetch|undici|go-http-client|okhttp|libwww|httpclient|java\/|scrapy|headlesschrome)/i;

/** True for user agents no real visitor's browser sends. */
export function isBotUserAgent(ua: string | null): boolean {
  if (!ua || ua.length < 20) return true;
  // The bot wraps its UA in literal double quotes — real browsers never do.
  if (ua.includes('"')) return true;
  if (SCRIPTED_UA.test(ua)) return true;
  // Firefox/Gecko builds from 2000–2009 (one of the fake leads claimed a 2007 "BonEcho").
  if (/Gecko\/20(0\d)\d{4}/.test(ua)) return true;
  return false;
}

// ----------------------------------------------------------- 2. token

const MIN_AGE_MS = 2_000; // the form itself waits this long before submitting (see ConsultationForm)
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // a form tab left open for hours must still work
const usedTokens = new Map<string, number>(); // nonce -> expiry

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set — cannot sign lead form tokens");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueFormToken(): string {
  const payload = `${Date.now()}.${randomBytes(8).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenResult = "ok" | "missing" | "invalid" | "expired" | "too_fast" | "replayed";

export function verifyFormToken(token: string | undefined | null): TokenResult {
  if (!token) return "missing";
  const parts = token.split(".");
  if (parts.length !== 3) return "invalid";
  const [ts, nonce, sig] = parts;
  const expected = sign(`${ts}.${nonce}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "invalid";

  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0) return "invalid";
  if (age > MAX_AGE_MS) return "expired";

  // Sweep expired entries opportunistically so the map can't grow unbounded.
  const now = Date.now();
  if (usedTokens.size > 5_000) for (const [k, exp] of usedTokens) if (exp < now) usedTokens.delete(k);

  if (usedTokens.has(nonce)) return "replayed";
  usedTokens.set(nonce, now + MAX_AGE_MS);

  if (age < MIN_AGE_MS) return "too_fast";
  return "ok";
}

// ------------------------------------------------------------- 4. Tor

const TOR_LIST_URL = "https://check.torproject.org/torbulkexitlist";
const TOR_TTL_MS = 6 * 60 * 60 * 1000;
let torIps = new Set<string>();
let torLoadedAt = 0;
let torLoading: Promise<void> | null = null;

async function refreshTorList(): Promise<void> {
  try {
    const res = await fetch(TOR_LIST_URL, { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (!res.ok) return;
    const ips = (await res.text()).split("\n").map((l) => l.trim()).filter((l) => /^[0-9a-f:.]+$/i.test(l));
    if (ips.length > 100) {
      torIps = new Set(ips);
      torLoadedAt = Date.now();
    }
  } catch {
    // Best-effort: on failure keep whatever list we already have.
  }
}

/** True if `ip` is a current Tor exit node. Never throws; fails open if the list can't be loaded. */
export async function isTorExit(ip: string): Promise<boolean> {
  if (Date.now() - torLoadedAt > TOR_TTL_MS && !torLoading) {
    torLoading = refreshTorList().finally(() => {
      torLoading = null;
    });
  }
  // Right after a restart there is no list yet — wait briefly for the first load so the first bot isn't free.
  if (torLoadedAt === 0 && torLoading) await Promise.race([torLoading, new Promise((r) => setTimeout(r, 3_000))]);
  return torIps.has(ip);
}
