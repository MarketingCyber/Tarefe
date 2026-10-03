import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/db";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { buildAlternates } from "@/lib/seo";
import { getGuideImage } from "@/lib/guide-images";

// force-dynamic, no generateStaticParams — guides are DB-managed via
// /ops/guides now (Phase 9's third CMS content type). See
// src/app/[locale]/faq/page.tsx's comment for the full explanation of why
// this is required, not optional, for any page reading CMS content.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.nav.guides, description: SUBTITLE[locale as Locale], alternates: buildAlternates(locale as Locale, "guides") };
}

const SUBTITLE: Record<Locale, string> = {
  fa: "راهنماهای عملی و مبتنی بر منابع واقعی برای زندگی و قراردادها در آلمان.",
  de: "Praktische, quellenbasierte Ratgeber für das Leben und Verträge in Deutschland.",
  ru: "Практические гиды, основанные на реальных источниках, о жизни и договорах в Германии.",
};

const READ_GUIDE: Record<Locale, string> = { fa: "مطالعه راهنما", de: "Ratgeber lesen", ru: "Читать гид" };

function pick(locale: Locale, fa: string, de: string | null, ru: string | null): string {
  return (locale === "de" ? de : locale === "ru" ? ru : null) ?? fa;
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  const guides = await prisma.guide.findMany({ where: { published: true }, orderBy: { order: "asc" } });

  return (
    <div>
      <SimplePageHeader
        items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: dict.nav.guides, href: `/${locale}/guides` }]}
        title={dict.nav.guides}
        subtitle={SUBTITLE[locale]}
      />
      <div className="container-page py-12">
        {guides.length === 0 ? (
          <p className="text-sm text-secondary">No guides published yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => {
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
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-base font-bold leading-snug text-purple-900">{pick(locale, guide.titleFa, guide.titleDe, guide.titleRu)}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-secondary">{pick(locale, guide.excerptFa, guide.excerptDe, guide.excerptRu)}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600">
                      {READ_GUIDE[locale]}
                      <ArrowRight size={13} weight="bold" className="rtl:rotate-180" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
