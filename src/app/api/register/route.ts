import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Manual email/password signup (2026-08-31) — built as the immediate,
 * unblocked path while Google sign-in stays wired but disabled (see
 * isGoogleAuthEnabled() in auth.ts): that needs a real domain + HTTPS
 * this deployment doesn't have yet, but "some way to self-register"
 * doesn't need to wait on that. Same account shape either way — a row in
 * `users` with role CUSTOMER — so nothing here conflicts with the Google
 * path landing later; an account created here can equally later be the
 * one a matching Google sign-in auto-links to.
 *
 * Honest limitation, not hidden: there's no email verification step and
 * no "forgot password" recovery, because both need an SMTP/email provider
 * this project doesn't have configured (same gap noted elsewhere in this
 * codebase's history — ECRM, error-tracking alerts). A self-registered
 * account is live immediately on an unverified email; if its owner
 * forgets the password, recovery is a manual DB reset by staff for now.
 */
const RegisterSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  locale: z.string().optional(),
});

export async function POST(request: Request) {
  // Public, unauthenticated, writes to the DB — same shape of endpoint
  // /api/leads and /api/events already rate-limit for the same reason.
  const { allowed } = rateLimit(`register:${getClientIp(request)}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const { name, email, password, locale } = parsed.data;
  const resolvedLocale: Locale = LOCALES.includes(locale as Locale) ? (locale as Locale) : "fa";

  // Explicit pre-check rather than relying on the DB's own unique
  // constraint on `email` — matches this codebase's existing style of
  // explicit validation over parsing a Prisma error code, at the cost of
  // a narrow (and here, harmless) race between two simultaneous signups
  // for the same address — the unique constraint is still the real
  // backstop if that ever happens.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "CUSTOMER", locale: resolvedLocale },
  });

  return NextResponse.json({ id: user.id }, { status: 201 });
}
