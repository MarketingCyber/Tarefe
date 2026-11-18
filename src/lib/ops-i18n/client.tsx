"use client";

import { createContext, useContext, useMemo } from "react";
import { opsI18nFor, type OpsI18n, type OpsLocale } from "./core";

const Ctx = createContext<OpsI18n>(opsI18nFor("fa"));

/** Set once in the /ops layout from the server's reading of the cookie, so client components render the same language. */
export function OpsI18nProvider({ locale, children }: { locale: OpsLocale; children: React.ReactNode }) {
  const value = useMemo(() => opsI18nFor(locale), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOpsI18n(): OpsI18n {
  return useContext(Ctx);
}
