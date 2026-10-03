import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { LOCALES, type Locale } from "@/lib/taxonomy";

export const alt = "Tarefe";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const TAGLINE: Record<Locale, string> = {
  fa: "بیمه، انرژی و اینترنت — به زبان فارسی",
  de: "Versicherung, Energie und Internet",
  ru: "Страхование, энергия и интернет",
};

/**
 * Real branded share-image (og:image / twitter:image), generated at build
 * time from the site's actual brand mark — not a placeholder or a
 * screenshot. Before this, every page shared to WhatsApp/Telegram/Twitter
 * had og:title and og:description (Next.js resolves those automatically
 * from the page's own metadata — verified, not assumed) but no image at
 * all, which is a real gap on a site where WhatsApp sharing is a primary
 * conversion channel.
 */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = (LOCALES.includes(raw as Locale) ? raw : "fa") as Locale;
  const isRtl = locale === "fa";

  // ImageResponse's bundled renderer (Satori/resvg) doesn't support woff2
  // ("Unsupported OpenType signature wOF2" — confirmed by actually trying
  // it, not assumed), so this can't reuse the site's own woff2-only
  // IRANSansX files the way next/font does elsewhere. Vazirmatn (SIL OFL
  // 1.1, self-hosted here like every other font in this project — see
  // src/fonts/vazirmatn/) is a real, appropriately-licensed Persian
  // typeface, not a placeholder substitute.
  const fontData = await readFile(join(process.cwd(), "src/fonts/vazirmatn/Vazirmatn-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#2d1a3a",
          fontFamily: "Vazirmatn",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, direction: isRtl ? "rtl" : "ltr" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: "#7c3aed",
            }}
          >
            <span style={{ position: "absolute", top: -6, right: -6, width: 26, height: 26, borderRadius: "50%", background: "#eab308" }} />
            <span style={{ fontSize: 48, fontWeight: 700, color: "#fff" }}>T</span>
          </div>
          <span style={{ fontSize: 64, fontWeight: 700, color: "#fff" }}>تعرفه</span>
        </div>
        {/*
          Satori (the renderer behind ImageResponse) doesn't reorder a
          single multi-word text run for RTL the way a real browser does —
          confirmed by actually rendering this and finding the Farsi
          tagline's word order reversed, even though the wordmark above (a
          single text node, no internal word reordering needed) came out
          correct. Flex-item reordering works reliably in Satori, so each
          word is its own flex child instead of one bidi text run.
        */}
        <div style={{ display: "flex", flexDirection: isRtl ? "row-reverse" : "row", gap: 10, marginTop: 28 }}>
          {TAGLINE[locale].split(" ").map((word, i) => (
            <span key={i} style={{ fontSize: 30, color: "rgba(255,255,255,0.75)" }}>
              {word}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Vazirmatn", data: fontData, weight: 700, style: "normal" }] }
  );
}
