import { prisma } from "@/lib/db";
import { findUserByEmail } from "@/lib/email-address";
import { ok, fail, readJson, isLocale } from "@/lib/app-api";
import { CODE_TTL_MINUTES, hashLoginCode, newLoginCode, normalizeEmail } from "@/lib/app-auth";
import { sendEmail, EmailNotConfiguredError } from "@/lib/email";
import { renderEmail } from "@/lib/email-template";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { Locale } from "@/lib/taxonomy";

/**
 * Step 1 of app sign-in: email a 6-digit code. Always answers the same way whether or not an account exists,
 * so this endpoint can't be used to find out who is a Tarefe customer. Staff and deactivated accounts never get
 * a code (they can't use the app), but the answer looks identical.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_CODES_PER_WINDOW = 3;

/**
 * Closed test (2026-10-29, owner's decision): while APP_BETA_EMAILS is set (comma-separated), only those addresses
 * get a code. Unset = open to every customer. Saying "not invited" reveals that an address isn't on the short test
 * list, nothing about customers.
 */
function invited(email: string) {
  const list = process.env.APP_BETA_EMAILS?.trim();
  if (!list) return true;
  return list.split(",").map((e) => normalizeEmail(e)).includes(email);
}
const WINDOW_MS = 10 * 60 * 1000;

const MAIL_TEXT: Record<Locale, { subject: (code: string) => string; heading: string; body: string; note: string }> = {
  fa: {
    subject: (code) => `کد ورود تو: ${code}`,
    heading: "کد ورود به اپ تعرفه",
    body: `این کد را در اپ وارد کن. تا ${CODE_TTL_MINUTES} دقیقه معتبر است.`,
    note: "اگر خودت این کد را نخواسته‌ای، این ایمیل را نادیده بگیر. بدون این کد کسی وارد حسابت نمی‌شود.",
  },
  de: {
    subject: (code) => `Ihr Anmeldecode: ${code}`,
    heading: "Ihr Code für die Tarefe-App",
    body: `Geben Sie diesen Code in der App ein. Er gilt ${CODE_TTL_MINUTES} Minuten.`,
    note: "Sie haben den Code nicht angefordert? Dann ignorieren Sie diese E-Mail. Ohne den Code kann sich niemand anmelden.",
  },
  ru: {
    subject: (code) => `Ваш код для входа: ${code}`,
    heading: "Код для входа в приложение Tarefe",
    body: `Введите этот код в приложении. Он действует ${CODE_TTL_MINUTES} минут.`,
    note: "Если вы не запрашивали код, просто проигнорируйте это письмо. Без кода никто не войдёт в ваш аккаунт.",
  },
};

/** The sign-in code e-mail: designed HTML (shared layout) plus the same content as plain text. */
function codeMail(locale: Locale, code: string) {
  const t = MAIL_TEXT[locale];
  return { subject: t.subject(code), ...renderEmail({ locale, preheader: t.subject(code), heading: t.heading, paragraphs: [t.body], code, note: t.note }) };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`app-code:${ip}`, 5).allowed) return fail(429, "too_many_requests", "Too many attempts, try again in a minute");

  const body = await readJson<{ email?: unknown; locale?: unknown }>(request);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (email.length > 254 || !EMAIL_RE.test(email)) return fail(400, "invalid_email", "Enter a valid email address");
  const locale: Locale = isLocale(body?.locale) ? body.locale : "fa";
  if (!invited(email)) return fail(403, "not_invited", "The app is in a closed test; ask Tarefe for an invitation");

  const recent = await prisma.appLoginCode.count({ where: { email, createdAt: { gt: new Date(Date.now() - WINDOW_MS) } } });
  if (recent >= MAX_CODES_PER_WINDOW) return fail(429, "too_many_codes", "Too many codes requested, wait a few minutes");

  const sentAnswer = ok({ sent: true, expiresInMinutes: CODE_TTL_MINUTES });

  const user = await findUserByEmail(email);
  if (user && (user.role !== "CUSTOMER" || !user.active)) return sentAnswer;

  const code = newLoginCode();
  await prisma.appLoginCode.create({
    data: { email, codeHash: hashLoginCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000), ip },
  });

  try {
    await sendEmail({ to: email, ...codeMail(locale, code) });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) return fail(503, "email_unavailable", "Email sending is not set up yet");
    throw error;
  }
  return sentAnswer;
}
