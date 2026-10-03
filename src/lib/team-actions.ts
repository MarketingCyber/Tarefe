"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Staff access management (2026-08-31, /ops/team) — closes a real gap: the
 * only code path anywhere that ever set role: "ADVISOR"/"ADMIN" was
 * prisma/seed.ts. Every action here is deliberately ADMIN-only, stricter
 * than any of the narrower per-resource gates the rest of /ops uses
 * (src/lib/permissions.ts) — granting or revoking a colleague's access, or
 * resetting their password/MFA, is not something any other role should be
 * able to do to another staff member, regardless of which resources that
 * role can otherwise reach.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

/** Every role /ops/team can hand out — CUSTOMER deliberately excluded (see createStaffAccount's own comment: that's a different, self-serve path). */
const ASSIGNABLE_STAFF_ROLES: UserRole[] = ["ADVISOR", "ADMIN", "LEAD_MANAGER", "CONTENT_EDITOR", "ANALYST"];

export async function createStaffAccount(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const role = formData.get("role") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (!name || !email || !password) return;
  if (password.length < 8) redirect("/ops/team?teamError=too_short");
  // Server-side, not just belt-and-suspenders: this form is a plain
  // Server Action with no client-side JS validating it first (unlike
  // RegisterForm's own confirm-password check), so this IS the only place
  // a typo in either password field ever gets caught.
  if (password !== confirmPassword) redirect("/ops/team?teamError=mismatch");
  // Only staff roles get created here — a self-serve CUSTOMER account
  // already has its own path (/register, or Google sign-in), and letting
  // this form create one too would just be a second, redundant route to
  // the same outcome with none of that path's own validation.
  if (!ASSIGNABLE_STAFF_ROLES.includes(role as UserRole)) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/ops/team?teamError=email_taken");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: role as UserRole, active: true },
  });
  revalidatePath("/ops/team");
}

export async function changeRole(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const userId = formData.get("userId") as string;
  const role = formData.get("role") as string;
  // Never through this form: no self-service role change, and no
  // demoting someone to CUSTOMER here — that's a different, bigger
  // action (they'd stop being staff entirely) than what this control is
  // for. Revoking access (below) is the right tool for "no longer works
  // here"; this one only moves someone between the five staff roles.
  if (userId === admin.id) return;
  if (!ASSIGNABLE_STAFF_ROLES.includes(role as UserRole)) return;

  await prisma.user.update({ where: { id: userId }, data: { role: role as UserRole } });
  revalidatePath("/ops/team");
}

export async function setAccessActive(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const userId = formData.get("userId") as string;
  const active = formData.get("active") === "true";
  if (userId === admin.id) return;

  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/ops/team");
}

export async function resetStaffMfa(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return;

  const userId = formData.get("userId") as string;
  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: null, mfaEnabled: false } });
  revalidatePath("/ops/team");
}

export async function resetStaffPassword(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const userId = formData.get("userId") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (!newPassword) return;
  if (newPassword.length < 8) redirect("/ops/team?teamError=too_short");
  if (newPassword !== confirmPassword) redirect("/ops/team?teamError=mismatch");

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/ops/team");
}
