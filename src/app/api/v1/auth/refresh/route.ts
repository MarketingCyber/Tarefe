import { ok, fail, readJson } from "@/lib/app-api";
import { rotateRefreshToken } from "@/lib/app-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/** Trades the refresh token for a new token pair. The old refresh token stops working immediately. */
export async function POST(request: Request) {
  if (!rateLimit(`app-refresh:${getClientIp(request)}`, 30).allowed) return fail(429, "too_many_requests");
  const body = await readJson<{ refreshToken?: unknown }>(request);
  const token = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  if (!token) return fail(400, "missing_token");
  const pair = await rotateRefreshToken(token);
  return pair ? ok(pair) : fail(401, "unauthorized", "Sign in again");
}
