import type { MetadataRoute } from "next";
import { LOCALES, allServicePaths } from "@/lib/taxonomy";
import { prisma } from "@/lib/db";

const SITE_URL = "https://tarefe.de";

const STATIC_PATHS = ["", "services", "guides", "about", "contact", "faq", "consultation", "privacy-policy", "imprint", "cookie-policy", "terms"];

// force-dynamic — this route is cached/prerendered by default (per
// Next.js's own sitemap.ts docs) unless something forces dynamic
// behavior, and guides are now DB-managed via /ops/guides (Phase 9).
// Without this, the same build-time-prerender-tries-to-hit-the-DB trap
// that hit /faq applies here too. See src/app/[locale]/faq/page.tsx's
// comment for the full explanation.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const guides = await prisma.guide.findMany({ where: { published: true } });

  for (const locale of LOCALES) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: `${SITE_URL}/${locale}${path ? `/${path}` : ""}`,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
      });
    }

    for (const segments of allServicePaths()) {
      entries.push({
        url: `${SITE_URL}/${locale}/services/${segments.join("/")}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const guide of guides) {
      entries.push({ url: `${SITE_URL}/${locale}/guides/${guide.slug}`, changeFrequency: "monthly", priority: 0.6, lastModified: guide.verifiedAt ?? guide.updatedAt });
    }
  }

  return entries;
}
