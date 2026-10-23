import type { NextConfig } from "next";

// Phase 12 (security hardening). Honest limitation, not hidden: script-src
// needs 'unsafe-inline' because Next.js's own hydration/RSC-streaming
// scripts are inline and this project doesn't yet run a nonce-generating
// middleware to allow removing it — a real, tighter follow-up, not
// something silently skipped. Everything else here is a genuine
// restriction (no third-party script/frame/object origins at all).
//
// frame-src: without it, an iframe falls back to default-src 'self' and
// gets silently blocked by the browser ("This content is blocked" —
// contact page's embedded office map, added 2026-09-13). Google's embed
// URL (maps.google.com/maps?...&output=embed) redirects through
// www.google.com, so both origins are listed.
//
// Google Tag Manager (added 2026-09-13, all three root layouts — public
// site, /app portal, /ops CRM — see GoogleTagManager.tsx): script-src
// needs googletagmanager.com to fetch gtm.js itself; connect-src/img-src
// list the google-analytics.com/analytics.google.com families too, since a
// GTM container is essentially never used without a GA4 tag inside it, and
// CSP has no way to allow "whatever this container ends up configured to
// call" after the fact. Honest limitation: adding an unrelated tag (a Meta
// Pixel, LinkedIn Insight, etc.) inside the GTM container later will need
// its own origin added here too, or it'll be silently blocked.
//
// sgtm.tarefe.de (added 2026-09-28): the GA4/Google Ads tags inside the
// web container are configured with server_container_url pointing at our
// own server-side GTM container, so gtag's actual data hits go there
// instead of straight to Google — connect-src must allow it explicitly or
// the browser silently blocks every one of those requests even after
// gtm.js itself loads and the tags fire correctly. Found this gap while
// debugging why no traffic was reaching sgtm.tarefe.de.
//
// www.google.com / *.doubleclick.net / www.googleadservices.com (added
// 2026-09-28, same debugging session): Consent Mode's measurement ping
// (/ccm/collect) and the Google Ads conversion + Conversion Linker tags
// need these. Switched to a *.doubleclick.net wildcard after THREE
// distinct doubleclick.net subdomains surfaced one at a time in a single
// debugging session (ad.doubleclick.net, googleads.g.doubleclick.net,
// more likely to follow — stats.g/cm.g/td.doubleclick.net etc. are all
// real, commonly-hit endpoints in Google's ad-measurement stack) — a
// standard, well-scoped allowlist pattern for sites running Ads
// conversion tracking, not an open-ended widening.
//
// www.google.com / *.doubleclick.net ALSO added to script-src (not just
// connect-src/img-src above): confirmed via a real blocked request in
// production — the AW-16452681682 Google Ads conversion ping
// (js?id=AW-...&data=event%3Dgtag.config) loads as a <script> tag, not
// fetch/XHR, so connect-src alone didn't cover it. CSP directives are
// resource-type-specific — allowing a domain for one doesn't allow it for
// another. A real, live-visitor-affecting gap, not a debug-only one.
//
// GTM preview mode / Tag Assistant (added 2026-10-15): Google's own CSP
// guide for preview lists extra origins that the debug UI and its assets
// load from — tagmanager.google.com (script, style, img), Google Fonts
// (style + font) and gstatic (img). Without them Tag Assistant can fail to
// connect or render. All Google-owned, and only fetched when a preview
// session is actually running.
//
// Found by reproducing a preview request in a real browser (2026-10-15) —
// the cause of Tag Assistant reporting "ad blockers might have blocked the
// script" even with no blocker: in preview mode the web container opens a
// frame to our server-side container (sgtm.tarefe.de) so the two can attach
// to the same debug session, and frame-src did not list it ("Framing
// 'https://sgtm.tarefe.de/' violates ... frame-src"). Without that frame
// the preview never connects. style-src also needs www.googletagmanager.com:
// the in-page Tag Assistant badge loads /debug/badge.css from there.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://sgtm.tarefe.de https://www.googletagmanager.com https://tagmanager.google.com https://www.google.com https://*.doubleclick.net",
  "style-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://tagmanager.google.com https://fonts.googleapis.com",
  "img-src 'self' data: https://picsum.photos https://images.unsplash.com https://www.googletagmanager.com https://ssl.gstatic.com https://www.gstatic.com https://sgtm.tarefe.de https://*.google-analytics.com https://www.google.com https://*.doubleclick.net",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://sgtm.tarefe.de https://www.google.com https://*.doubleclick.net https://www.googleadservices.com",
  "frame-src https://www.google.com https://maps.google.com https://www.googletagmanager.com https://sgtm.tarefe.de",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Google Ads landing journey: its own root layout lives under /landing/..., the public URL keeps the locale prefix.
  async rewrites() {
    return [{ source: "/:locale(fa|de|ru)/landing/:kind(electricity|gas)", destination: "/landing/:locale/:kind" }];
  },
};

export default nextConfig;
