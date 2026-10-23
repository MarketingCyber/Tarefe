import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/taxonomy";

/**
 * Sign-in for the mobile app (2026-10-23). The website keeps NextAuth's cookie session; a phone app can't rely
 * on cookies, so the app gets its own token pair:
 *
 *  - a short-lived access token (JWT, 15 minutes) sent as `Authorization: Bearer …` on every API call, and
 *  - a long-lived refresh token (random, 60 days) that the app keeps in the phone's secure storage and trades
 *    for a new pair when the access token runs out.
 *
 * Owner's rule: no SMS, no password — the customer types their email and gets a 6-digit code by email.
 * Only hashes of codes and refresh tokens are stored. Refresh tokens rotate on every use; presenting an
 * already-rotated token again means it was copied, so that whole session is revoked.
 *
 * Only CUSTOMER accounts can use the app. Staff sign in to /ops (password + 2-step login) instead.
 */

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 60;
export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
const ISSUER = "tarefe-app";

function key(purpose: string): Uint8Array {
  const base = process.env.AUTH_SECRET;
  if (!base) throw new Error("AUTH_SECRET is not set");
  // A separate key per purpose, derived from the one secret the deployment already has.
  return createHash("sha256").update(`${base}:${purpose}`).digest();
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function newLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashLoginCode(email: string, code: string): string {
  return createHash("sha256").update(key("app-login-code")).update(email).update(":").update(code).digest("hex");
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export type TokenPair = { accessToken: string; refreshToken: string; expiresIn: number };

async function signAccess(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(key("app-access-token"));
}

const refreshExpiry = () => new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

export async function issueSession(userId: string, meta: { deviceName?: string; platform?: string }): Promise<TokenPair> {
  const refreshToken = randomBytes(32).toString("base64url");
  const session = await prisma.appSession.create({
    data: {
      userId,
      refreshTokenHash: sha256(refreshToken),
      deviceName: meta.deviceName?.slice(0, 80) || null,
      platform: meta.platform?.slice(0, 20) || null,
      expiresAt: refreshExpiry(),
    },
  });
  return { accessToken: await signAccess(userId, session.id), refreshToken, expiresIn: ACCESS_TTL_SECONDS };
}

/** Trades a refresh token for a new pair. Returns null when the token is unknown, expired, revoked or reused. */
export async function rotateRefreshToken(refreshToken: string): Promise<TokenPair | null> {
  const hash = sha256(refreshToken);
  const session = await prisma.appSession.findUnique({ where: { refreshTokenHash: hash }, include: { user: true } });

  if (!session) {
    // An old, already-rotated token came back: someone else holds a copy. End that session for everyone.
    const reused = await prisma.appSession.findFirst({ where: { previousTokenHash: hash, revokedAt: null } });
    if (reused) await prisma.appSession.update({ where: { id: reused.id }, data: { revokedAt: new Date() } });
    return null;
  }
  if (session.revokedAt || session.expiresAt < new Date()) return null;
  if (!session.user.active || session.user.role !== "CUSTOMER") return null;

  const next = randomBytes(32).toString("base64url");
  await prisma.appSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: sha256(next), previousTokenHash: hash, lastUsedAt: new Date(), expiresAt: refreshExpiry() },
  });
  return { accessToken: await signAccess(session.userId, session.id), refreshToken: next, expiresIn: ACCESS_TTL_SECONDS };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.appSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export type AppUser = { id: string; email: string; name: string; locale: Locale; sessionId: string };

/**
 * The signed-in app customer for this request, or null. Checks the session row on every call (not just the
 * JWT signature) so signing out or a revoked session takes effect immediately, not after 15 minutes.
 */
export async function getAppUser(request: Request): Promise<AppUser | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  let userId: string | undefined;
  let sessionId: string | undefined;
  try {
    const { payload } = await jwtVerify(header.slice(7), key("app-access-token"), { issuer: ISSUER, audience: ISSUER, algorithms: ["HS256"] });
    userId = payload.sub;
    sessionId = typeof payload.sid === "string" ? payload.sid : undefined;
  } catch {
    return null;
  }
  if (!userId || !sessionId) return null;

  const session = await prisma.appSession.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.revokedAt || session.userId !== userId || session.expiresAt < new Date()) return null;
  const user = session.user;
  if (!user.active || user.role !== "CUSTOMER") return null;
  return { id: user.id, email: user.email, name: user.name, locale: user.locale, sessionId };
}
