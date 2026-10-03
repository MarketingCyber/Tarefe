import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

// IranSansX Pro, self-hosted (provided by the client — see C:\Pourya\Tarefe\Website\Fonts).
// Replaces Vazirmatn as the Persian typeface per direct instruction.
export const iransansx = localFont({
  src: [
    { path: "../fonts/iransansx/IRANSansX-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/iransansx/IRANSansX-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/iransansx/IRANSansX-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/iransansx/IRANSansX-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/iransansx/IRANSansX-ExtraBold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-fa",
  display: "swap",
});
