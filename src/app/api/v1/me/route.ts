import { prisma } from "@/lib/db";
import { ok, fail, readJson, requireUser, isLocale } from "@/lib/app-api";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  return ok({ id: user.id, email: user.email, name: user.name, locale: user.locale });
}

/** The customer can change their display name and app language. Email changes go through an advisor. */
export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const body = await readJson<{ name?: unknown; locale?: unknown }>(request);
  if (!body) return fail(400, "invalid_body");

  const data: { name?: string; locale?: "fa" | "de" | "ru" } = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 80) return fail(400, "invalid_name", "Name must be 2 to 80 characters");
    data.name = body.name.trim();
  }
  if (body.locale !== undefined) {
    if (!isLocale(body.locale)) return fail(400, "invalid_locale");
    data.locale = body.locale;
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data, select: { id: true, email: true, name: true, locale: true } });
  return ok(updated);
}
