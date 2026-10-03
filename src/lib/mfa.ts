import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
// otplib 13 rewrote its API from the v12 `authenticator`/`totp` singleton
// objects (what most docs/training data still show) to a plain functional
// API — confirmed by reading the installed package's own .d.ts files rather
// than trusting the remembered import shape, since a wrong import here would
// have failed the build silently different ways depending on which shape
// was wrong.
import { generateSecret as otpGenerateSecret, generateURI, verify as otpVerify } from "otplib";
import QRCode from "qrcode";

/**
 * TOTP secrets are encrypted at rest (AES-256-GCM) using a key derived
 * from AUTH_SECRET — never rolling custom crypto for the TOTP algorithm
 * itself (that's otplib, a standard RFC 6238 implementation), only for
 * protecting the secret in the DB. A key derived from AUTH_SECRET means
 * anyone who could decrypt this already controls session signing too, so
 * this isn't pretending to defend against a fully-compromised server —
 * it defends against the more likely case of a DB dump/backup leaking on
 * its own without the app's env also leaking.
 */
function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required to encrypt/decrypt MFA secrets");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(".");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return otpGenerateSecret();
}

/**
 * A small epochTolerance (1 step = 30s each direction) accounts for normal
 * clock drift between the server and the user's phone — RFC 6238's own
 * recommendation — without opening a wide replay window.
 */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  try {
    const result = await otpVerify({ secret, token: code.trim(), epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

export async function totpQrCodeDataUrl(secret: string, email: string): Promise<string> {
  const otpauthUrl = generateURI({ issuer: "Tarefe Ops", label: email, secret });
  return QRCode.toDataURL(otpauthUrl);
}
