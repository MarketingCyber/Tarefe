import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lightning, WifiHigh, PiggyBank, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LOCALES, TAXONOMY, byLocale, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { buildAlternates } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const ICONS = { shield: Shield, bolt: Lightning, wifi: WifiHigh, "piggy-bank": PiggyBank };

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.nav.services, description: dict.home.categoriesSubtitle, alternates: buildAlternates(locale as Locale, "services") };
}

export default async function ServicesRootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: dict.nav.services, href: `/${locale}/services` }]} />

      <h1 className="mt-2 text-3xl font-bold text-purple-900 md:text-4xl">{dict.nav.services}</h1>
      <p className="mt-3 max-w-[60ch] text-secondary">{dict.home.categoriesSubtitle}</p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {/* Unpublished categories (currently: communication) are filtered
            out entirely, not shown as a disabled/"coming soon" placeholder
            — that treatment fits a category being teased ahead of launch,
            not one that's been actively removed. published:false still
            gates routing/sitemap on its own (taxonomy.ts), this filter
            just keeps this listing consistent with that. */}
        {TAXONOMY.filter((category) => category.published).map((category) => {
          const Icon = ICONS[category.icon as keyof typeof ICONS];
          return (
            <Link key={category.slug} href={`/${locale}/services/${category.slug}`}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600/10 text-purple-600">
                  <Icon size={22} weight="duotone" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, category.title)}</h2>
                  <p className="mt-1.5 text-sm text-secondary">{byLocale(locale, category.description)}</p>
                </div>
                <ul className="mt-auto flex flex-wrap gap-2">
                  {category.subcategories.map((sub) => (
                    <li key={sub.slug} className="rounded-full border border-border bg-tint px-2.5 py-1 text-xs text-body">
                      {byLocale(locale, sub.title)}
                    </li>
                  ))}
                </ul>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600">
                  {dict.nav.services}
                  <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
