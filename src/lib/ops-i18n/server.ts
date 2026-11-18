import { cache } from "react";
import { cookies } from "next/headers";
import { OPS_LOCALE_COOKIE, isOpsLocale, opsI18nFor, type OpsI18n } from "./core";

/** The staff member's CRM language for this request (server components, server actions). */
export const getOpsI18n = cache(async (): Promise<OpsI18n> => {
  const value = (await cookies()).get(OPS_LOCALE_COOKIE)?.value;
  return opsI18nFor(isOpsLocale(value) ? value : "fa");
});
