"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider as NextAuthSessionProvider, useSession } from "next-auth/react";

/**
 * The actual mechanism behind "I lose my login state after using the
 * browser's Back button": the public site is ~500 statically-generated
 * pages (Cache-Control allows long-lived caching — confirmed via curl,
 * unlike /app and /ops which are correctly `no-store`), so they're eligible
 * for the browser's back/forward cache (bfcache). Navigating back to one
 * restores the exact in-memory snapshot from before you left — including
 * whatever the navbar's session-aware UI (AccountMenu) looked like at that
 * moment, e.g. still showing "Login" if you visited that page before
 * signing in.
 *
 * next-auth's own SessionProvider already listens for `visibilitychange`
 * to self-correct this, but that event does NOT reliably fire on a
 * same-tab bfcache restore (the tab was never actually hidden, so there's
 * nothing to transition from) — it mainly catches switching tabs/apps and
 * back. The documented, reliable signal for "this exact page just came
 * back out of bfcache" is `pageshow`'s `event.persisted` flag, which does
 * fire in that case. On it: `update()` re-fetches the session so
 * AccountMenu re-renders correctly, and `router.refresh()` does the same
 * for any Server Component data that was equally frozen in the snapshot.
 */
function BfcacheSessionGuard() {
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      update();
      router.refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router, update]);

  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <BfcacheSessionGuard />
      {children}
    </NextAuthSessionProvider>
  );
}
