import type { Locale } from "@/lib/taxonomy";

/**
 * The one layout every customer e-mail uses (2026-11-17): sign-in code, staff reply, request status. Mobile first —
 * a single column that fills a phone screen (20px side margin) and stops at 520px on desktop, 16px body text,
 * a full-width 48px button, the sign-in code large enough to read at a glance and copied as plain digits.
 *
 * Built for e-mail clients, not browsers: tables + inline styles (Gmail strips most <style>), no images (often
 * blocked, so the brand is a text wordmark), no web fonts (system fonts per script), right-to-left for Persian.
 * Every e-mail also gets a plain-text part with the same content.
 */

export type EmailContent = {
  locale: Locale;
  /** Shown by the inbox next to the subject; keep the essential fact in it (e.g. the code). */
  preheader: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  /** A one-time code, shown big and on its own. */
  code?: string;
  button?: { label: string; url: string };
  /** Small print under the main content (e.g. "didn't ask for this? ignore it"). */
  note?: string;
};

const C = {
  purple: "#5d0089",
  ink: "#241426",
  body: "#4a3a4e",
  muted: "#776a7a",
  page: "#f4eef7",
  card: "#ffffff",
  tint: "#faf6fc",
  line: "#ece2f1",
  yellow: "#f7c800",
};

const FONT: Record<Locale, string> = {
  fa: "Vazirmatn, 'Segoe UI', Tahoma, Arial, sans-serif",
  de: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  ru: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const ADDRESS = ["Tarefe · Kesselstr. 3 · 40221 Düsseldorf", "info@tarefe.de · +49 211 54218000"];

const FOOTER: Record<Locale, { tagline: string; why: string }> = {
  fa: {
    tagline: "همه خدمات تعرفه رایگان است.",
    why: "این ایمیل را دریافت کرده‌اید چون در تعرفه حساب دارید یا کد ورود خواسته‌اید.",
  },
  de: {
    tagline: "Alle Leistungen von Tarefe sind kostenlos.",
    why: "Sie erhalten diese E-Mail, weil Sie ein Konto bei Tarefe haben oder einen Anmeldecode angefordert haben.",
  },
  ru: {
    tagline: "Все услуги Tarefe бесплатны.",
    why: "Вы получили это письмо, потому что у вас есть аккаунт в Tarefe или вы запросили код для входа.",
  },
};

/**
 * The logo (purple, from the owner 2026-11-17; sources in docs/brand/) as PNG — Outlook can't show WebP. Served by the
 * site itself; 480px wide, shown at 160px so it stays sharp on phone screens. When a mail app blocks images, the alt
 * text "Tarefe" shows in brand purple instead.
 */
const LOGO = { url: "https://tarefe.de/email/tarefe-logo.png", width: 160, height: 50 };

/** Under the code: a long press selects the whole code in one go (user-select: all), then "Copy". */
const COPY_HINT: Record<Locale, string> = {
  fa: "برای کپی، کد را لمس کن و نگه دار.",
  de: "Zum Kopieren den Code gedrückt halten.",
  ru: "Чтобы скопировать, нажмите на код и удерживайте.",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const rtl = c.locale === "fa";
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const font = FONT[c.locale];
  const f = FOOTER[c.locale];
  const p = (s: string, extra = "") =>
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:${C.body};${extra}">${esc(s)}</p>`;

  const code = c.code
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 20px;"><tr><td align="center" dir="ltr" style="background:${C.tint};border:1px solid ${C.line};border-radius:14px;padding:20px 12px;">
<div style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:10px;color:${C.ink};padding-left:10px;-webkit-user-select:all;-moz-user-select:all;user-select:all;cursor:text;">${esc(c.code)}</div>
<div style="margin-top:10px;font-family:${font};font-size:13px;line-height:1.5;color:${C.muted};" dir="${dir}">${esc(COPY_HINT[c.locale])}</div>
</td></tr></table>`
    : "";

  const button = c.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;"><tr><td align="center" style="border-radius:12px;background:${C.purple};">
<a href="${esc(c.button.url)}" style="display:block;padding:14px 20px;font-family:${font};font-size:16px;font-weight:700;line-height:20px;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(c.button.label)}</a>
</td></tr></table>`
    : "";

  const html = `<!doctype html>
<html lang="${c.locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.heading)}</title>
<style>
  @media (min-width: 600px) { .card { padding: 36px 36px 28px !important; } .h1 { font-size: 24px !important; } }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(c.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px 32px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" dir="${dir}" style="max-width:520px;font-family:${font};text-align:${align};">
    <tr><td align="${align}" style="padding:0 8px 16px;">
      <img src="${LOGO.url}" width="${LOGO.width}" height="${LOGO.height}" alt="Tarefe" style="display:inline-block;width:${LOGO.width}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;font-family:${FONT.de};font-size:22px;font-weight:800;color:${C.purple};">
    </td></tr>
    <tr><td class="card" style="background:${C.card};border:1px solid ${C.line};border-radius:18px;padding:28px 20px 22px;">
      <h1 class="h1" style="margin:0 0 16px;font-size:21px;line-height:1.45;font-weight:800;color:${C.ink};">${esc(c.heading)}</h1>
      ${c.greeting ? p(c.greeting) : ""}
      ${c.paragraphs.map((s) => p(s)).join("\n      ")}
      ${code}
      ${button}
      ${c.note ? `<p style="margin:4px 0 0;padding-top:14px;border-top:1px solid ${C.line};font-size:13px;line-height:1.7;color:${C.muted};">${esc(c.note)}</p>` : ""}
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.7;color:${C.muted};">
      <p style="margin:0 0 6px;font-weight:700;color:${C.body};">${esc(f.tagline)}</p>
      <p style="margin:0 0 6px;">${esc(f.why)}</p>
      ${ADDRESS.map((l) => `<p style="margin:0;white-space:nowrap;" dir="ltr">${esc(l)}</p>`).join("")}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    c.heading,
    "",
    ...(c.greeting ? [c.greeting, ""] : []),
    ...c.paragraphs.flatMap((s) => [s, ""]),
    ...(c.code ? [c.code, ""] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ""] : []),
    ...(c.note ? [c.note, ""] : []),
    "—",
    f.tagline,
    ...ADDRESS,
  ].join("\n");

  return { html, text };
}
