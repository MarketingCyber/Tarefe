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

/**
 * Delete account (2026-10-29; both stores require it in-app). Effective at once: the customer is signed out
 * everywhere, can't sign in again (website or app), and their devices, notifications and login codes are gone.
 * Contracts, messages and documents are business records with legal retention periods, so they are not wiped
 * here: an urgent task tells the team to finish the deletion and keep only what the law requires.
 */
export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  await prisma.$transaction([
    prisma.appSession.deleteMany({ where: { userId: user.id } }),
    prisma.device.deleteMany({ where: { userId: user.id } }),
    prisma.notification.deleteMany({ where: { userId: user.id } }),
    prisma.appLoginCode.deleteMany({ where: { email: user.email } }),
    prisma.user.update({ where: { id: user.id }, data: { active: false } }),
    prisma.task.create({
      data: {
        title: "حذف حساب از اپ درخواست شد",
        notes: `${user.name} (${user.email}) حسابش را در اپ حذف کرد. ورودش بسته شد؛ بقیه داده‌های شخصی را پاک کنید و فقط آنچه قانون نگه‌داشتنش را لازم می‌داند نگه دارید.`,
        priority: "URGENT",
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        customerId: user.id,
      },
    }),
  ]);
  return ok({ deleted: true });
}
