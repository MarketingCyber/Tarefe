import Script from "next/script";
import { META_PIXEL_ID } from "@/lib/meta-pixel";

/**
 * Loads Meta's pixel script (fbevents.js) and initialises it. Fires nothing by itself: the owner chose to send
 * only the Lead event, which ConsultationForm triggers after a successful submission (see lib/meta-pixel.ts).
 * Mounted on the public site and the Google Ads landing pages; not in /app or /ops.
 */
export function MetaPixel() {
  if (!META_PIXEL_ID) return null;
  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');`;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {snippet}
    </Script>
  );
}
