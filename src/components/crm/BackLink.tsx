"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { useOpsI18n } from "@/lib/ops-i18n/client";

/**
 * «بازگشت» on every CRM detail page (owner 2026-11-18): returns to the page the user actually came from — a ticket
 * opened from a customer goes back to that customer, a list keeps its filters — using the browser's own history.
 * When there is no earlier CRM page in this tab (link opened directly or in a new tab), it goes to `fallback`.
 */
const CURRENT = "ops-nav-current";
const PREVIOUS = "ops-nav-previous";

function read(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Mounted once in the /ops layout: remembers the previous CRM page of this tab. */
export function OpsNavTracker() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => {
    const here = query ? `${pathname}?${query}` : pathname;
    try {
      const current = window.sessionStorage.getItem(CURRENT);
      if (current !== here) {
        if (current) window.sessionStorage.setItem(PREVIOUS, current);
        window.sessionStorage.setItem(CURRENT, here);
      }
    } catch {
      // Storage blocked: BackLink then always uses its fallback.
    }
  }, [pathname, query]);
  return null;
}

export function BackLink({ fallback }: { fallback: string }) {
  const { t } = useOpsI18n();
  const router = useRouter();
  return (
    <a
      href={fallback}
      onClick={(e) => {
        const previous = read(PREVIOUS);
        if (previous?.startsWith("/ops") && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600"
    >
      <ArrowRight size={14} weight="bold" className="ltr:-scale-x-100" />
      {t("بازگشت")}
    </a>
  );
}
