"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/permissions";
import { OPS_LOCALE_COOKIE, isOpsLocale } from "./core";

/** The language switch in the CRM side menu. Staff only; a year, scoped to /ops. */
export async function setOpsLocale(locale: string) {
  const session = await auth();
  if (!session?.user || !isStaffRole(session.user.role) || !isOpsLocale(locale)) return;
  (await cookies()).set(OPS_LOCALE_COOKIE, locale, { path: "/ops", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}
