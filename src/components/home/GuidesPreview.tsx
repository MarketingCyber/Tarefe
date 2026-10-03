import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { type Locale } from "@/lib/taxonomy";
import { prisma } from "@/lib/db";
import { getGuideImage } from "@/lib/guide-images";

const TITLE: Record<Locale, string> = { fa: "راهنماهای تعرفه", de: "Tarefe-Ratgeber", ru: "Гиды Tarefe" };
const SUBTITLE: Record<Locale, string> = {
  fa: "قبل از تصمیم‌گیری، بدون هیچ ادعای ساختگی، واقعیت‌ها را بخوان.",
  de: "Bevor Sie entscheiden, lesen Sie die Fakten — ohne erfundene Behauptungen.",
  ru: "Прежде чем решить, узнайте факты — без вымышленных утверждений.",
};
const VIEW_ALL: Record<Locale, string> = { fa: "همه راهنماها", de: "Alle Ratgeber", ru: "Все гиды" };

function pick(locale: Locale, fa: string, de: string | null, ru: string | null): string {
  return (locale === "de" ? de : locale === "ru" ? ru : null) ?? fa;
}

/** Already a Server Component (server-only, just synchronous before) — reading directly from the DB needs no prop-drilling from the homepage, unlike FaqSection ("use client"). */
export async function GuidesPreview({ locale }: { locale: Locale }) {
  const featured = await prisma.guide.findMany({ where: { published: true }, orderBy: { order: "asc" }, take: 3 });
  if (featured.length === 0) return null;

  return (
    <section className="border-t border-border bg-tint py-16 md:py-24">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-purple-900 md:text-3xl">{TITLE[locale]}</h2>
            <p className="mt-2 max-w-[50ch] text-sm text-secondary md:text-base">{SUBTITLE[locale]}</p>
          </div>
          <Link href={`/${locale}/guides`} className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-purple-600 sm:inline-flex">
            {VIEW_ALL[locale]}
            <ArrowRight size={13} weight="bold" className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {featured.map((guide) => {
            const image = getGuideImage(guide.slug);
            return (
              <Link
                key={guide.id}
                href={`/${locale}/guides/${guide.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {image && (
                  <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
                    <Image
                      src={image}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-sm font-bold leading-snug text-purple-900">{pick(locale, guide.titleFa, guide.titleDe, guide.titleRu)}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-secondary">{pick(locale, guide.excerptFa, guide.excerptDe, guide.excerptRu)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <Link href={`/${locale}/guides`} className="press mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 sm:hidden">
          {VIEW_ALL[locale]}
          <ArrowRight size={13} weight="bold" className="rtl:rotate-180" />
        </Link>
      </div>
    </section>
  );
}
