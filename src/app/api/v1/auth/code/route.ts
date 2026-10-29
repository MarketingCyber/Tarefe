import { prisma } from "@/lib/db";
import { ok, fail, readJson, isLocale } from "@/lib/app-api";
import { CODE_TTL_MINUTES, hashLoginCode, newLoginCode, normalizeEmail } from "@/lib/app-auth";
import { sendEmail, EmailNotConfiguredError } from "@/lib/email";
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

const MAIL: Record<Locale, (code: string) => { subject: string; text: string }> = {
  fa: (code) => ({ subject: `کد ورود تو: ${code}`, text: `کد ورود به اپ تعرفه: ${code}\n\nاین کد ${CODE_TTL_MINUTES} دقیقه معتبر است. اگر خودت درخواست نکرده‌ای، این ایمیل را نادیده بگیر.` }),
  de: (code) => ({ subject: `Ihr Anmeldecode: ${code}`, text: `Ihr Code für die Tarefe-App: ${code}\n\nDer Code gilt ${CODE_TTL_MINUTES} Minuten. Wenn Sie ihn nicht angefordert haben, ignorieren Sie diese E-Mail.` }),
  ru: (code) => ({ subject: `Ваш код для входа: ${code}`, text: `Код для входа в приложение Tarefe: ${code}\n\nКод действует ${CODE_TTL_MINUTES} минут. Если вы его не запрашивали, просто проигнорируйте это письмо.` }),
};

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

  const user = await prisma.user.findUnique({ where: { email }, select: { role: true, active: true } });
  if (user && (user.role !== "CUSTOMER" || !user.active)) return sentAnswer;

  const code = newLoginCode();
  await prisma.appLoginCode.create({
    data: { email, codeHash: hashLoginCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000), ip },
  });

  try {
    await sendEmail({ to: email, ...MAIL[locale](code) });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) return fail(503, "email_unavailable", "Email sending is not set up yet");
    throw error;
  }
  return sentAnswer;
}
