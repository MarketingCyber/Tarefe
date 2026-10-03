/**
 * Simple in-memory sliding-window rate limiter for public, unauthenticated
 * API routes (/api/leads, /api/events) — the two endpoints anyone on the
 * internet can hit with no login required, so they're the ones actually
 * exposed to scripted abuse (fake leads, event-log spam).
 *
 * Honest limitation: this state lives in the Node process's memory, not a
 * shared store like Redis. That's fine for this deployment (one PM2
 * instance, not a load-balanced fleet) but would need a real shared store
 * the moment this app runs on more than one server — noted here rather
 * than silently assumed to scale.
 */
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

// Bound the map itself so a flood of distinct spoofed IPs can't grow this
// unboundedly between sweeps.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  for (const [key, timestamps] of hits) {
    const recent = timestamps.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) hits.delete(key);
    else hits.set(key, recent);
  }
}

export function rateLimit(key: string, limit: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  if (hits.size > MAX_TRACKED_KEYS) sweep(now);

  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, remaining: limit - timestamps.length };
}

/** Best-effort client IP behind the Nginx reverse proxy this app runs behind. */
export function getClientIp(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}

/**
 * Same lookup, for callers that only have a `Headers`-shaped object rather
 * than a full `Request` — Server Actions (unlike Route Handlers or
 * NextAuth's `authorize()`) never receive a `Request` directly; the
 * equivalent there is `next/headers`'s `headers()`, whose return type
 * structurally matches this minimal shape.
 */
export function getClientIpFromHeaders(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
