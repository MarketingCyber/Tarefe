/**
 * Coarse device / browser / OS buckets from a User-Agent header, for the
 * analytics explorer's dimensions (2026-10-15).
 *
 * Deliberately tiny and dependency-free: reporting only needs a handful of
 * buckets, and only the BUCKET is stored — never the raw UA string, which
 * is far more identifying than "mobile / Safari / iOS". Order matters in
 * every list below: many browsers include other browsers' names in their UA
 * (Edge and Chrome both say "Chrome", every iOS browser says "Safari"), so
 * the more specific token is tested first.
 */
export interface UserAgentBuckets {
  device: "mobile" | "tablet" | "desktop";
  browser: string;
  os: string;
}

export function parseUserAgent(ua: string | null | undefined): UserAgentBuckets {
  const s = ua ?? "";

  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s));
  const isMobile = !isTablet && /Mobi|iPhone|iPod|Android.+Mobile|Windows Phone|Opera Mini|IEMobile/i.test(s);

  let os = "Other";
  if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/CrOS/i.test(s)) os = "ChromeOS";
  else if (/Linux|X11/i.test(s)) os = "Linux";

  let browser = "Other";
  if (/Instagram/i.test(s)) browser = "Instagram in-app";
  else if (/FBAN|FBAV|FB_IAB/i.test(s)) browser = "Facebook in-app";
  else if (/Telegram/i.test(s)) browser = "Telegram in-app";
  else if (/EdgiOS|EdgA|Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(s)) browser = "Firefox";
  else if (/CriOS|Chrome\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s)) browser = "Safari";

  return { device: isTablet ? "tablet" : isMobile ? "mobile" : "desktop", browser, os };
}
