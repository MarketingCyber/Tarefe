"use client";

import { useEffect } from "react";
import Script from "next/script";
import { CONSENT_CHANGED_EVENT, PREFS_KEY, type CookiePrefs } from "@/lib/cookie-consent";

// Single source of truth for the container id — the public site, the Ads landing pages, the customer portal and
// the internal ops area each have their own root layout and all render this; they must never drift onto different ids.
const GTM_ID = "GTM-M2LGN5WC";

// The container script is served by our own tagging server (server-side GTM, see /opt/tarefe.de/sgtm on the server),
// so it comes from the first-party domain. If that server ever cannot be reached, the loader falls back to Google's address.
const GTM_HOST = "https://sgtm.tarefe.de";

/**
 * Google Tag Manager (served from sgtm.tarefe.de, 2026-10-23), loaded on EVERY page view straight away (2026-10-22).
 *
 * Consent Mode v2 follows the visitor's cookie settings (lib/cookie-consent.ts), which are ON by default
 * (owner's decision, 2026-10-29): analytics_storage = the "analytics" switch, ad_storage / ad_user_data /
 * ad_personalization = the "ads" switch. The default is written to the dataLayer BEFORE the container loads, so no
 * tag starts without it; saving new settings sends a consent "update" (no reload). Google's tags obey this by
 * themselves; the Meta Pixel and Clarity tags in GTM are set to require ad_storage / analytics_storage, so they obey
 * it too.
 */
const BOOT = `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
var p={};try{p=JSON.parse(window.localStorage.getItem('${PREFS_KEY}')||'{}')||{};}catch(e){}
var a=p.analytics===false?'denied':'granted',d=p.ads===false?'denied':'granted';
gtag('consent','default',{analytics_storage:a,ad_storage:d,ad_user_data:d,ad_personalization:d});
gtag('set','url_passthrough',true);
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
dl=l!='dataLayer'?'&l='+l:'';
function load(host){var j=d.createElement(s);j.async=true;j.src=host+'/gtm.js?id='+i+dl;
if(host!=='https://www.googletagmanager.com'){j.onerror=function(){load('https://www.googletagmanager.com');};}
f.parentNode.insertBefore(j,f);}
load('${GTM_HOST}');
})(window,document,'script','dataLayer','${GTM_ID}');`;

function updateConsent(prefs: CookiePrefs) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag()'s `arguments` object is what Consent Mode listens for — a plain array would be ignored.
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params -- Consent Mode requires the real `arguments` object
    w.dataLayer!.push(arguments);
  } as (...args: unknown[]) => void;
  const ads = prefs.ads ? "granted" : "denied";
  gtag("consent", "update", { analytics_storage: prefs.analytics ? "granted" : "denied", ad_storage: ads, ad_user_data: ads, ad_personalization: ads });
}

export function GtmScript() {
  useEffect(() => {
    const onChange = (e: Event) => updateConsent((e as CustomEvent<CookiePrefs>).detail);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  return (
    <Script id="gtm-script" strategy="afterInteractive">
      {BOOT}
    </Script>
  );
}

/**
 * No noscript fallback: Google's classic install snippet loads GTM's tracking iframe for visitors with JavaScript
 * disabled; those visits are not tracked.
 */
