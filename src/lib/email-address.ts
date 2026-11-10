import { prisma } from "@/lib/db";

/**
 * One account per e-mail address, whatever its capitals. Addresses are stored lowercase from 2026-11-10 on; lookups
 * ignore case because older rows may still be stored as typed (a website sign-up as "Name@…" and an app sign-in as
 * "name@…" used to create two accounts for the same person).
 */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The account with this e-mail address, ignoring case; the oldest one if duplicates exist from before. */
export function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: normalizeEmail(email), mode: "insensitive" } }, orderBy: { createdAt: "asc" } });
}
