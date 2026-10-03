import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/db";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { buildAlternates } from "@/lib/seo";

// No generateStaticParams here (unlike most public pages) — FAQ content is
// now DB-managed via /ops/faq (Phase 9's first CMS content type), so this
// page has to actually run on request. SSG would keep serving whatever
// was true at the last build, silently ignoring anything staff publish
// afterward — the entire point of a CMS is that it doesn't need one.
//
// export const dynamic is required, not just optional belt-and-braces:
// Next.js's default ('auto') still tries to statically prerender a page at
// BUILD time even without generateStaticParams, unless something forces
// dynamic behavior — a plain `await prisma.x.findMany()` doesn't count as
// one of those signals on its own. Confirmed directly against this
// version's docs (node_modules/next/dist/docs), not assumed from memory —
// AGENTS.md's "this is NOT the Next.js you know" warning is real: without
// this, the build tries to hit the DB during prerendering and fails
// outright against this project's local DATABASE_URL, which is a bare
// placeholder (there is no local Postgres — see AGENTS.md/session history).
export const dynamic = "force-dynamic";

const DESCRIPTION: Record<Locale, string> = {
  fa: "پاسخ سوالات پرتکرار درباره بیمه و انرژی و خدمات تعرفه برای فارسی‌زبانان مقیم آلمان.",
  de: "Antworten auf häufig gestellte Fragen zu Versicherung, Energie und den Leistungen von Tarefe.",
  ru: "Ответы на часто задаваемые вопросы о страховании, энергии и услугах Tarefe.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.nav.faq, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "faq") };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!LOCALES.includes(raw as Locale)) throw new Error(`Invalid locale: ${raw}`);
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  const faqs = await prisma.faqItem.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  const items = faqs.map((f) => ({
    q: { fa: f.questionFa, de: f.questionDe, ru: f.questionRu },
    a: { fa: f.answerFa, de: f.answerDe, ru: f.answerRu },
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.q[locale],
      acceptedAnswer: { "@type": "Answer", text: faq.a[locale] },
    })),
  };

  return (
    <div>
      <SimplePageHeader items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: dict.nav.faq, href: `/${locale}/faq` }]} title={dict.nav.faq} />
      <div className="container-page max-w-3xl py-12">
        <FaqAccordion items={items} locale={locale} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
