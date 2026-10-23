import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/app-api";

/** The app Home slider: active slides for the customer's language, in staff order, at most 5. */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const now = new Date();
  const banners = await prisma.appBanner.findMany({
    where: {
      active: true,
      locale: user.locale,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
    take: 5,
  });

  const origin = new URL(request.url).origin;
  return ok({
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      ctaLabel: b.ctaLabel,
      target: b.target,
      // The version stamp makes a replaced image show up at once despite caching.
      imageUrl: b.imagePath ? `${origin}/api/v1/banners/${b.id}/image?v=${b.updatedAt.getTime()}` : null,
    })),
  });
}
