import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, LinkSimple } from "@phosphor-icons/react/dist/ssr";
import { byLocale, getCategory, getSubcategory, getProductType, isCollapsedSubcategory, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/db";
import { parseGuideBody, type GuideSource } from "@/lib/guide-body";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { buildAlternates } from "@/lib/seo";
import { getGuideImage } from "@/lib/guide-images";
import { Reveal } from "@/components/shared/Reveal";

// force-dynamic, no generateStaticParams — same reason as /guides/page.tsx.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = await prisma.guide.findUnique({ where: { slug } });
  if (!guide) return {};
  const l = locale as Locale;
  return {
    title: pick(l, guide.titleFa, guide.titleDe, guide.titleRu),
    description: pick(l, guide.excerptFa, guide.excerptDe, guide.excerptRu),
    alternates: buildAlternates(l, `guides/${slug}`),
  };
}

function pick(locale: Locale, fa: string, de: string | null, ru: string | null): string {
  return (locale === "de" ? de : locale === "ru" ? ru : null) ?? fa;
}

const VERIFIED_LABEL: Record<Locale, (date: string) => string> = {
  fa: (d) => `اطلاعات این راهنما در تاریخ ${d} بررسی و تایید شده است.`,
  de: (d) => `Die Angaben in diesem Ratgeber wurden am ${d} geprüft.`,
  ru: (d) => `Информация в этом гиде проверена ${d}.`,
};
const SOURCES_LABEL: Record<Locale, string> = { fa: "منابع", de: "Quellen", ru: "Источники" };
const RELATED_CTA_LABEL: Record<Locale, string> = {
  fa: "دریافت مشاوره رایگان برای این خدمت",
  de: "Kostenlose Beratung für diesen Bereich",
  ru: "Бесплатная консультация по этой услуге",
};
const BACK_LABEL: Record<Locale, string> = { fa: "بازگشت به راهنماها", de: "Zurück zu den Ratgebern", ru: "Назад к гидам" };

export default async function GuideDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const guide = await prisma.guide.findUnique({ where: { slug } });
  if (!guide || !guide.published) notFound();

  const title = pick(locale, guide.titleFa, guide.titleDe, guide.titleRu);
  const excerpt = pick(locale, guide.excerptFa, guide.excerptDe, guide.excerptRu);
  const body = pick(locale, guide.bodyFa, guide.bodyDe, guide.bodyRu);
  const sections = parseGuideBody(body);
  const sources = (guide.sources as GuideSource[] | null) ?? [];

  const image = getGuideImage(guide.slug);

  const category = guide.relatedCategory ? getCategory(guide.relatedCategory) : undefined;
  const subcategory = category && guide.relatedSubcategory ? getSubcategory(category.slug, guide.relatedSubcategory) : undefined;
  const productType = subcategory && guide.relatedProductType ? getProductType(category!.slug, subcategory.slug, guide.relatedProductType) : undefined;
  const relatedTitle = productType ? byLocale(locale, productType.title) : subcategory ? byLocale(locale, subcategory.title) : undefined;
  const relatedHref =
    category && subcategory
      ? `/${locale}/services/${category.slug}/${subcategory.slug}${!isCollapsedSubcategory(subcategory) && productType ? `/${productType.slug}` : ""}`
      : undefined;

  // Every field here is real, not fabricated: headline/description are the
  // guide's own copy, dateModified is verifiedAt (the actual date the facts
  // were last checked, set by staff in /ops/guides), publisher is the real
  // organization. No invented author name, no fake engagement stats.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    dateModified: guide.verifiedAt?.toISOString(),
    inLanguage: locale,
    publisher: { "@type": "Organization", name: "Tarefe", url: "https://tarefe.de" },
  };

  return (
    <div className="pb-16">
      <SimplePageHeader
        items={[
          { label: dict.breadcrumbHome, href: `/${locale}` },
          { label: dict.nav.guides, href: `/${locale}/guides` },
          { label: title, href: `/${locale}/guides/${guide.slug}` },
        ]}
        title={title}
        subtitle={excerpt}
      />

      <article className="container-page max-w-[70ch] py-12">
        {image && (
          <Reveal>
            <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl border border-border">
              <Image src={image} alt="" fill sizes="(min-width: 768px) 70ch, 100vw" className="object-cover" />
            </div>
          </Reveal>
        )}

        {sections.map((section, i) => (
          <section key={i} className={i > 0 ? "mt-8" : ""}>
            {section.heading && <h2 className="text-lg font-bold text-purple-900">{section.heading}</h2>}
            {section.paragraphs.map((p, j) => (
              <p key={j} className={`text-sm leading-relaxed text-body ${section.heading || j > 0 ? "mt-3" : ""}`}>
                {p}
              </p>
            ))}
          </section>
        ))}

        {guide.verifiedAt && (
          <div className="mt-10 border-t border-border pt-6">
            <p className="text-xs text-secondary">{VERIFIED_LABEL[locale](guide.verifiedAt.toLocaleDateString(locale === "fa" ? "fa-IR" : locale === "de" ? "de-DE" : "ru-RU"))}</p>
            {sources.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-secondary">{SOURCES_LABEL[locale]}</p>
                <ul className="mt-1.5 space-y-1">
                  {sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-purple-600 hover:underline">
                        <LinkSimple size={12} />
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {relatedHref && relatedTitle && (
          <div className="mt-8 rounded-2xl bg-purple-900 p-6 text-center">
            <p className="text-sm text-white/70">{relatedTitle}</p>
            <Link href={relatedHref} className="press mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-purple-900">
              {RELATED_CTA_LABEL[locale]}
              <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
            </Link>
          </div>
        )}

        <Link href={`/${locale}/guides`} className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
          <ArrowLeft size={14} weight="bold" className="rtl:rotate-180" />
          {BACK_LABEL[locale]}
        </Link>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
    </div>
  );
}
