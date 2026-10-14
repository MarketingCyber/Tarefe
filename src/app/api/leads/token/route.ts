import { NextResponse } from "next/server";
import { issueFormToken } from "@/lib/lead-guard";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Issues the signed, single-use token the consultation form must send with
 * its submission (see lib/lead-guard.ts for why). Never cached — each form
 * load gets its own. Rate limited so it can't itself be used to farm tokens.
 */
export async function GET(request: Request) {
  const { allowed } = rateLimit(`lead-token:${getClientIp(request)}`, 20);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  return NextResponse.json({ token: issueFormToken() }, { headers: { "Cache-Control": "no-store" } });
}
