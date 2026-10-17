import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { DIRECT, classifySource, paidClickIdName } from "@/lib/traffic-source";
import { parseUserAgent } from "@/lib/user-agent";

/**
 * Cookie-free landing counter (2026-10-16). Called from src/proxy.ts for every
 * FULL page load — a visitor's browser navigating to one of our pages — so ad
 * clicks and other visits are counted even when the visitor never touches the
 * cookie banner (which gates the event tracking in lib/analytics.ts).
 *
 * What is stored, per page load: the path (no query string), the traffic source
 * (utm_* / paid click id / referrer, via the same rules as the browser tracker),
 * device / browser / OS buckets, and `visitor`. What is NOT stored: the IP
 * address, the user-agent string, the raw URL or click-id value, or anything on
 * the visitor's device. `visitor` is an HMAC of IP + user agent under a key that
 * changes every day, so it can count distinct visitors within one day but cannot
 * recognise or link a person across days — and the key cannot be recovered from
 * the database.
 *
 * Only hits from real browsers are kept: bots, crawlers, link-preview fetchers,
 * monitoring tools, Next.js prefetches and client-side navigations are skipped.
 * Never throws and never delays the response (proxy.ts runs it via waitUntil).
 */

const SITE_HOST = "tarefe.de";

/** Crawlers, link-preview fetchers, uptime/perf monitors and scripted clients — none of these are people. */
export const BOT_UA = /bot\b|bot[/;)]|crawl|spider|slurp|adsbot|google-adwords|googleother|google-inspectiontool|storebot|apis-google|mediapartners|feedfetcher|lighthouse|pagespeed|gtmetrix|pingdom|uptime|facebookexternalhit|embedly|whatsapp\/|telegrambot|skypeuripreview|headless|phantomjs|selenium|puppeteer|playwright|curl\/|wget|python|aiohttp|httpx|axios|node-fetch|undici|go-http|okhttp|java\/|scrapy|libwww|httpclient/i;

/** True only for a person's browser loading a page (not a prefetch, an RSC fetch, an image, a bot…). */
export function isPageLoadByBrowser(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  const h = request.headers;
  // Next.js client-side navigation / prefetch requests: Next strips its own rsc / prefetch headers and the _rsc
  // query param before the proxy runs, so they cannot be detected here — but a router fetch() always carries
  // Sec-Fetch-Dest: empty (or an Accept without text/html on old browsers), which the check below rejects.
  const purpose = `${h.get("purpose") ?? ""} ${h.get("sec-purpose") ?? ""}`.toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return false;

  const dest = h.get("sec-fetch-dest");
  if (dest !== null) {
    if (dest !== "document") return false; // iframes, images, scripts…
    const mode = h.get("sec-fetch-mode");
    if (mode !== null && mode !== "navigate") return false;
  } else if (!(h.get("accept") ?? "").includes("text/html")) {
    return false; // older browsers without Sec-Fetch-*: require an HTML accept
  }

  const ua = h.get("user-agent") ?? "";
  if (ua.length < 20 || BOT_UA.test(ua)) return false;
  return true;
}

function berlinDay(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

/** Anonymous per-day visitor id — see the file header for what it can and cannot do. */
export function visitorHash(ip: string, ua: string): string {
  const key = `${process.env.AUTH_SECRET ?? "tarefe-dev"}:landing:${berlinDay()}`;
  return createHmac("sha256", key).update(`${ip}|${ua}`).digest("hex").slice(0, 20);
}

/** The host the visitor used — behind nginx the Host header may be the internal 127.0.0.1:3001. */
function ownHostOf(request: NextRequest): string {
  const raw = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? SITE_HOST).split(":")[0].toLowerCase();
  if (process.env.NODE_ENV === "production" && (raw === "127.0.0.1" || raw === "localhost")) return SITE_HOST;
  return raw;
}

export async function recordLanding(request: NextRequest): Promise<void> {
  try {
    if (!isPageLoadByBrowser(request)) return;

    const { pathname, searchParams } = request.nextUrl;
    const referrer = request.headers.get("referer") ?? "";
    const ua = request.headers.get("user-agent") ?? "";
    const c = classifySource(request.nextUrl.search, referrer, ownHostOf(request));
    if (c.internal) return; // a full reload / hard navigation inside our own site is not a new arrival

    const snap = c.snap ?? DIRECT;
    const first = pathname.split("/")[1];
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") ?? "unknown").trim();
    const { device, browser, os } = parseUserAgent(ua);
    // Every real desktop browser identifies as Chrome, Safari, Firefox, Edge or Opera. A desktop that does not is a
    // script (on 2026-10-17 about 200 of one day's 287 visits were this, hitting /fa/consultation once each).
    if (device === "desktop" && browser === "Other") return;

    await prisma.landingHit.create({
      data: {
        path: pathname.slice(0, 300),
        locale: LOCALES.includes(first as Locale) ? (first as Locale) : null,
        source: (snap.source ?? "(not set)").slice(0, 100),
        medium: (snap.medium ?? "(not set)").slice(0, 100),
        campaign: snap.campaign?.slice(0, 200) ?? null,
        term: snap.term?.slice(0, 200) ?? null,
        content: snap.content?.slice(0, 200) ?? null,
        clickId: paidClickIdName(searchParams),
        device,
        browser,
        os,
        visitor: visitorHash(ip, ua),
      },
    });
  } catch {
    // Counting must never be the reason a page fails to load.
  }
}
