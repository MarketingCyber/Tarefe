"use client";

import Script from "next/script";

// Single source of truth for the container id — the public site, the Ads landing pages, the customer portal and
// the internal ops area each have their own root layout and all render this; they must never drift onto different ids.
const GTM_ID = "GTM-M2LGN5WC";

// The container script is served by our own tagging server (server-side GTM, see /opt/tarefe.de/sgtm on the server),
// so it comes from the first-party domain. If that server ever cannot be reached, the loader falls back to Google's address.
const GTM_HOST = "https://sgtm.tarefe.de";

/**
 * Google Tag Manager (served from sgtm.tarefe.de, 2026-10-23), loaded on EVERY page view straight away (2026-10-22).
 *
 * Owner's decision (2026-10-29): no consent check in any tag or tool. Google Consent Mode v2 is still declared,
 * because Google's tags expect a consent state, but it is always GRANTED (ad_storage, analytics_storage,
 * ad_user_data, ad_personalization), written to the dataLayer BEFORE the container loads so no tag starts without
 * it. The cookie banner is only a notice (CookieConsentBanner.tsx) and changes nothing here. The non-Google tags in
 * the container (Meta Pixel, Clarity) have no consent settings in GTM either.
 */
const BOOT = `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'granted',analytics_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});
gtag('set','url_passthrough',true);
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
dl=l!='dataLayer'?'&l='+l:'';
function load(host){var j=d.createElement(s);j.async=true;j.src=host+'/gtm.js?id='+i+dl;
if(host!=='https://www.googletagmanager.com'){j.onerror=function(){load('https://www.googletagmanager.com');};}
f.parentNode.insertBefore(j,f);}
load('${GTM_HOST}');
})(window,document,'script','dataLayer','${GTM_ID}');`;

export function GtmScript() {
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
