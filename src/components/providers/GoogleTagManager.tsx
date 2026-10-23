"use client";

import { useEffect } from "react";
import Script from "next/script";
import { getConsent, CONSENT_CHANGED_EVENT, CONSENT_KEY, type ConsentValue } from "@/lib/cookie-consent";

// Single source of truth for the container id — the public site, the Ads landing pages, the customer portal and
// the internal ops area each have their own root layout and all render this; they must never drift onto different ids.
const GTM_ID = "GTM-M2LGN5WC";

// Where the container script (gtm.js) comes from. Serving it from our own tagging server (https://sgtm.tarefe.de, via the
// "GTM Web Container" client) was tried on 2026-10-23 and ROLLED BACK: the container then loaded a second time from Google,
// which produced two page_view events per page view and pings with consent already "granted" before any choice.
// The tags still send their DATA to sgtm.tarefe.de (server_container_url inside the container) - only the script itself is Google-hosted.
const GTM_HOST = "https://www.googletagmanager.com";

/**
 * Google Tag Manager (served from sgtm.tarefe.de, 2026-10-23), loaded on EVERY page view straight away (2026-10-22), before the visitor answers the cookie
 * banner — but in Google Consent Mode v2 with everything DENIED until they accept:
 *
 *  - The default consent state is written to the dataLayer BEFORE the container loads (the order matters: a tag
 *    that starts first would see no consent state at all). It is "granted" only when the stored banner choice is
 *    already "accepted"; otherwise ad_storage, analytics_storage, ad_user_data and ad_personalization are denied.
 *  - Google's own tags (GA4, Ads conversion, linker) read that state and, while it is denied, set no cookies and
 *    send only cookieless pings. url_passthrough keeps the Google Ads click id (gclid) travelling in the page links
 *    so a conversion can still be attributed after consent; ads_data_redaction strips ad identifiers from those pings.
 *  - Accepting the banner sends a consent "update" to granted (no reload); choosing "necessary only" after having
 *    accepted sends it back to denied.
 *
 * What this does NOT do: stop Google receiving the visitor's IP address and browser details from the moment the
 * container script is requested (that is how loading any script works), and it cannot make a tag that is NOT a
 * Google tag honour the denied state — every non-Google tag in the container must have a consent check set in
 * GTM itself, or it will set cookies before consent. Verify in GTM Preview, and look for _ga / _gcl_* cookies
 * before accepting.
 */
const BOOT = `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
var c=null;try{c=window.localStorage.getItem('${CONSENT_KEY}');}catch(e){}
var g=c==='accepted'?'granted':'denied';
gtag('consent','default',{ad_storage:g,analytics_storage:g,ad_user_data:g,ad_personalization:g,wait_for_update:500});
gtag('set','url_passthrough',true);
gtag('set','ads_data_redaction',true);
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
dl=l!='dataLayer'?'&l='+l:'';
function load(host){var j=d.createElement(s);j.async=true;j.src=host+'/gtm.js?id='+i+dl;
if(host!=='https://www.googletagmanager.com'){j.onerror=function(){if(w.google_tag_manager&&w.google_tag_manager[i])return;load('https://www.googletagmanager.com');};}
f.parentNode.insertBefore(j,f);}
load('${GTM_HOST}');
})(window,document,'script','dataLayer','${GTM_ID}');`;

function updateConsent(state: "granted" | "denied") {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  // gtag()'s `arguments` object is what Consent Mode listens for — a plain array would be ignored.
  const gtag = function () {
    // eslint-disable-next-line prefer-rest-params -- Consent Mode requires the real `arguments` object
    w.dataLayer!.push(arguments);
  } as (...args: unknown[]) => void;
  gtag("consent", "update", { ad_storage: state, analytics_storage: state, ad_user_data: state, ad_personalization: state });
}

export function GtmScript() {
  useEffect(() => {
    // The boot script already read the stored choice; this only reacts to a choice made during this visit.
    const onChange = (e: Event) => updateConsent((e as CustomEvent<ConsentValue>).detail === "accepted" ? "granted" : "denied");
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    // A choice stored by another tab after this one booted.
    if (getConsent() === "accepted") updateConsent("granted");
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
 * disabled, and those visitors can never see or answer the (JavaScript) cookie banner, so a noscript pixel would
 * fire for exactly the audience that has no way to consent to it.
 */
