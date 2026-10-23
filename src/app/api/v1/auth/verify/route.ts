import { prisma } from "@/lib/db";
import { ok, fail, readJson, isLocale } from "@/lib/app-api";
import { MAX_CODE_ATTEMPTS, hashLoginCode, issueSession, normalizeEmail, sameHash } from "@/lib/app-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Step 2 of app sign-in: check the 6-digit code and start an app session. A first-time email becomes a new
 * customer account (no password; the app asks for the name afterwards). Each code works once, for 10 minutes,
 * and is dead after 5 wrong tries.
 */

// Persian and Arabic-Indic digits typed on a Persian keyboard count as normal digits.
const toLatinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!rateLimit(`app-verify:${ip}`, 10).allowed) return fail(429, "too_many_requests", "Too many attempts, try again in a minute");

  const body = await readJson<{ email?: unknown; code?: unknown; deviceName?: unknown; platform?: unknown; locale?: unknown }>(request);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const code = typeof body?.code === "string" ? toLatinDigits(body.code.trim()) : "";
  if (!email || !/^\d{6}$/.test(code)) return fail(400, "invalid_code", "The code has 6 digits");

  const record = await prisma.appLoginCode.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.attempts >= MAX_CODE_ATTEMPTS) return fail(400, "code_expired", "This code is no longer valid, ask for a new one");

  if (!sameHash(record.codeHash, hashLoginCode(email, code))) {
    await prisma.appLoginCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return fail(400, "invalid_code", "Wrong code");
  }

  // Claim the code atomically so two parallel requests can't both use it.
  const claimed = await prisma.appLoginCode.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return fail(400, "code_expired", "This code is no longer valid, ask for a new one");

  let user = await prisma.user.findUnique({ where: { email } });
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({ data: { email, name: "", role: "CUSTOMER", locale: isLocale(body?.locale) ? body.locale : "fa" } });
  } else if (user.role !== "CUSTOMER" || !user.active) {
    return fail(403, "not_allowed", "This account can't use the app");
  }

  const tokens = await issueSession(user.id, {
    deviceName: typeof body?.deviceName === "string" ? body.deviceName : undefined,
    platform: typeof body?.platform === "string" ? body.platform : undefined,
  });
  return ok({ ...tokens, isNew, user: { id: user.id, email: user.email, name: user.name, locale: user.locale } });
}
