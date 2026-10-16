"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { getConsent, CONSENT_CHANGED_EVENT, type ConsentValue } from "@/lib/cookie-consent";

// Single source of truth for the container id — three independent root
// layouts (public site, customer portal, internal ops; see each layout's
// own "multiple root layouts" comment) render this, and they must never
// drift onto different ids.
const GTM_ID = "GTM-M2LGN5WC";

/**
 * Set once a visit has been recognised as a Google Tag Assistant preview
 * session, so the rest of that browser tab's navigation (Tag Assistant
 * keeps you browsing the site) keeps loading GTM. sessionStorage, not
 * localStorage: it must die with the preview tab.
 */
const PREVIEW_FLAG = "tarefe:gtm_preview_session";

/**
 * Is this visit a Tag Assistant / GTM preview session?
 *
 * Tag Assistant opens the site with a `gtm_debug` query parameter, from a
 * page on tagassistant.google.com / tagmanager.google.com, so the referrer
 * is Google's. Requiring BOTH the parameter and that referrer is what keeps
 * this from being a way to switch GTM on for an ordinary visitor: no other
 * website can send a Google referrer. (A `window.opener` check was
 * considered and rejected — any site can open a popup to this page, so it
 * proves nothing about who is on the other end.)
 *
 * If a preview ever fails to connect because the browser stripped the
 * referrer, the fallback is simply to accept the cookie banner first.
 */
function isTagAssistantSession(): boolean {
  try {
    if (window.sessionStorage.getItem(PREVIEW_FLAG) === "1") return true;
    if (!new URLSearchParams(window.location.search).has("gtm_debug")) return false;

    let referrerHost = "";
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      /* unparsable referrer — treated as none */
    }
    const fromGoogle = referrerHost === "tagassistant.google.com" || referrerHost === "tagmanager.google.com";
    if (fromGoogle) {
      window.sessionStorage.setItem(PREVIEW_FLAG, "1");
      return true;
    }
  } catch {
    /* storage unavailable — fall through to "not a preview session" */
  }
  return false;
}

type Mode = "off" | "consented" | "preview-denied";

/**
 * The <head>-placed bootstrap script. App Router layouts can't render a
 * manual <head> for arbitrary scripts, so — per Next's own "Application
 * Scripts" pattern (next/dist/docs/01-app/02-guides/scripts.md) — this is
 * rendered as a sibling of <body>, inside <html>, in each root layout.
 *
 * Consent-gated (2026-09-15): the GTM container has GA4 and Google Ads
 * conversion tracking configured inside it, both of which set
 * non-essential cookies — so, same as this site's own first-party
 * analytics (see cookie-consent.ts), it must not load before the visitor
 * has actually accepted on the cookie banner, not just after a delay. A
 * "use client" component (not the plain Script-returning function this
 * was before) so it can read the stored choice and react live if the
 * visitor accepts mid-session, without needing a page reload. The 3s
 * setTimeout inside the bootstrap itself stays — once consent is granted,
 * gtm.js still doesn't need to compete with this page's own load/
 * interactivity metrics.
 *
 * Preview exception (2026-10-15): Tag Assistant could not connect to the
 * site, because a fresh preview window has no stored consent, the banner
 * is showing, and GTM — which Tag Assistant needs to see — never loaded.
 * A recognised preview session (see isTagAssistantSession) now loads GTM
 * straight away, with Consent Mode defaults set to DENIED first and a
 * consent "update" sent if the person then accepts the banner.
 *
 * KNOWN LIMITATION (verified 2026-10-15): the tags inside the container
 * do not honour the denied default — _ga / _gcl_au were set in a preview
 * session before any acceptance. That is a container-side setting
 * (consent checks on the GA4 / Ads tags), not something this component can
 * enforce. It only affects recognised Tag Assistant sessions, i.e. staff;
 * ordinary visitors still get no GTM at all before accepting.
 */
export function GtmScript() {
  const [mode, setMode] = useState<Mode>("off");
  // True while GTM was booted in the denied state and still awaits an accept.
  const bootedDenied = useRef(false);

  useEffect(() => {
    const consented = getConsent() === "accepted";
    const preview = !consented && isTagAssistantSession();
    bootedDenied.current = preview;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately starts "off" on the server/first client render (avoids an SSR mismatch) and only syncs from localStorage/sessionStorage, external systems, once mounted — same pattern as QualificationWizard.tsx's saved-progress restore
    setMode(consented ? "consented" : preview ? "preview-denied" : "off");

    const onChange = (e: Event) => {
      const accepted = (e as CustomEvent<ConsentValue>).detail === "accepted";
      if (accepted && bootedDenied.current) {
        // GTM is already running with consent denied — tell it the visitor has now agreed.
        bootedDenied.current = false;
        const w = window as unknown as { dataLayer?: unknown[] };
        w.dataLayer = w.dataLayer || [];
        // gtag()'s `arguments` object is what Consent Mode listens for — a plain array would be ignored.
        const gtag = function () {
          // eslint-disable-next-line prefer-rest-params -- Consent Mode requires the real `arguments` object
          w.dataLayer!.push(arguments);
        } as (...args: unknown[]) => void;
        gtag("consent", "update", { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
        setMode("consented");
        return;
      }
      setMode((prev) => (accepted ? "consented" : prev === "preview-denied" ? prev : "off"));
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  if (mode === "off") return null;

  const preview = mode === "preview-denied";
  const consentDefaults = preview
    ? `function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
`
    : "";

  return (
    <Script id="gtm-script" strategy="afterInteractive">
      {`window.dataLayer=window.dataLayer||[];
${consentDefaults}setTimeout(function(){
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
},${preview ? 0 : 3000});`}
    </Script>
  );
}

/**
 * No noscript fallback: Google's classic install snippet unconditionally
 * loads GTM's tracking iframe for visitors with JavaScript disabled — but
 * those same visitors can never see or interact with the (JS-driven)
 * cookie-consent banner, so an unconditional noscript pixel would fire
 * tracking for exactly the one audience that has no way to consent to it.
 * Since GTM here is opt-in only, dropping the noscript fallback entirely
 * is the correct behavior, not a gap — there's no way to gate a <noscript>
 * element on a client-side-only consent choice.
 */
