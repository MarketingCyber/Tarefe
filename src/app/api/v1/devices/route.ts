import { prisma } from "@/lib/db";
import { ok, fail, readJson, requireUser, isLocale } from "@/lib/app-api";

/** Registers this phone for push notifications (or moves the token to the account now signed in on it). */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await readJson<{ platform?: unknown; pushToken?: unknown; locale?: unknown; appVersion?: unknown }>(request);
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : null;
  const pushToken = typeof body?.pushToken === "string" ? body.pushToken.trim() : "";
  if (!platform || !pushToken || pushToken.length > 255) return fail(400, "invalid_device");

  const data = {
    userId: user.id,
    platform,
    locale: isLocale(body?.locale) ? body.locale : user.locale,
    appVersion: typeof body?.appVersion === "string" ? body.appVersion.slice(0, 20) : null,
    lastSeenAt: new Date(),
  };
  const device = await prisma.device.upsert({ where: { pushToken }, create: { ...data, pushToken }, update: data, select: { id: true } });
  return ok({ deviceId: device.id });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await readJson<{ pushToken?: unknown }>(request);
  if (typeof body?.pushToken !== "string") return fail(400, "invalid_device");
  await prisma.device.deleteMany({ where: { userId: user.id, pushToken: body.pushToken } });
  return ok({ removed: true });
}
