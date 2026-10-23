import { prisma } from "@/lib/db";
import { ok, readJson, requireUser } from "@/lib/app-api";
import { revokeSession } from "@/lib/app-auth";

/** Ends this phone's session and, when the app sends it, stops push notifications to this phone. */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await readJson<{ pushToken?: unknown }>(request);
  if (typeof body?.pushToken === "string") await prisma.device.deleteMany({ where: { userId: user.id, pushToken: body.pushToken } });
  await revokeSession(user.sessionId);
  return ok({ signedOut: true });
}
