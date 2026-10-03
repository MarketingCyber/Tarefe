"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { getConsent, CONSENT_CHANGED_EVENT, type ConsentValue } from "@/lib/cookie-consent";

// Single source of truth for the container id — three independent root
// layouts (public site, customer portal, internal ops; see each layout's
// own "multiple root layouts" comment) render this, and they must never
// drift onto different ids.
const GTM_ID = "GTM-M2LGN5WC";

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
 */
export function GtmScript() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately starts disabled on the server/first client render (avoids an SSR mismatch) and only syncs from localStorage, an external system, once mounted — same pattern as QualificationWizard.tsx's saved-progress restore
    setEnabled(getConsent() === "accepted");
    const onChange = (e: Event) => setEnabled((e as CustomEvent<ConsentValue>).detail === "accepted");
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  if (!enabled) return null;

  return (
    <Script id="gtm-script" strategy="afterInteractive">
      {`window.dataLayer=window.dataLayer||[];
setTimeout(function(){
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
},3000);`}
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
