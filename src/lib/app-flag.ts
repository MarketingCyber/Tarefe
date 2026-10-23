/**
 * Mobile app switch (2026-10-24). The app's back end (/api/v1) and its two staff pages live in this repo, but the
 * owner isn't ready to publish the app ("dont deploy the app just website"), so they stay OFF unless the server's
 * env says APP_ENABLED=true. Off = proxy.ts answers 404 for these paths and OpsNav hides their menu entries, so a
 * normal website deploy can't publish them by accident. The laptop sets it in .env to work on the app.
 */
export const APP_PATHS = ["/api/v1", "/ops/conversations", "/ops/app-banners"] as const;

export function isAppEnabled(): boolean {
  return process.env.APP_ENABLED === "true";
}

export function isAppPath(pathname: string): boolean {
  return APP_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
