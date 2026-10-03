import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, allServicePaths, resolveServicesPath, breadcrumbsFor, byLocale, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { KNOWN_TARIFFS } from "@/lib/pdp-data";
import { buildAlternates } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CategoryView } from "@/components/services/CategoryView";
import { SubcategoryView } from "@/components/services/SubcategoryView";
import { PlpView } from "@/components/services/PlpView";
import { PdpView } from "@/components/services/PdpView";
import { AudienceView } from "@/components/services/AudienceView";

function formatPdpTitle(pdpSlug: string): string {
  return KNOWN_TARIFFS[pdpSlug] ? `${KNOWN_TARIFFS[pdpSlug].provider} ${KNOWN_TARIFFS[pdpSlug].name}` : pdpSlug.replace(/-/g, " ");
}

// The energy/electricity and energy/gas PLPs now query the (DB-backed)
// energy_tariffs table at render time — excluded here from static
// prerendering for the same reason /faq and /guides are force-dynamic
// (see faq/page.tsx's comment): a build-time prerender would hit the DB
// against this project's local, placeholder DATABASE_URL and fail
// outright. Skipping them from generateStaticParams (rather than making
// the whole catch-all route dynamic) means every other PLP/PDP/category
// page — the overwhelming majority, none of them DB-backed — still gets
// full static generation; these two just render on-demand instead
// (dynamicParams defaults to true, so they still work, just not
// pre-built). allServicePaths() itself stays untouched — the sitemap and
// anything else that enumerates all paths still lists them.
const DYNAMIC_SERVICE_PATHS = [
  ["energy", "electricity"],
  ["energy", "gas"],
];

export function generateStaticParams() {
  const paths = allServicePaths().filter((slug) => !DYNAMIC_SERVICE_PATHS.some((dynamicPath) => dynamicPath.length === slug.length && dynamicPath.every((seg, i) => seg === slug[i])));
  return LOCALES.flatMap((locale) => paths.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const match = resolveServicesPath(slug);
  if (match.type === "not-found") return {};

  const title =
    match.type === "category"
      ? byLocale(locale, match.category.title)
      : match.type === "subcategory"
        ? byLocale(locale, match.subcategory.title)
        : match.type === "plp"
          ? byLocale(locale, match.productType.title)
          : match.type === "audience"
            ? byLocale(locale, match.audience.title)
            : formatPdpTitle(match.pdpSlug);

  const description =
    match.type === "category"
      ? byLocale(locale, match.category.description)
      : match.type === "subcategory"
        ? byLocale(locale, match.subcategory.description)
        : match.type === "plp"
          ? byLocale(locale, match.productType.description)
          : match.type === "audience"
            ? byLocale(locale, match.audience.description)
            : byLocale(locale, match.productType.description);

  return { title, description, alternates: buildAlternates(locale, `services/${slug.join("/")}`) };
}

export default async function ServicesCatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const match = resolveServicesPath(slug);

  if (match.type === "not-found") notFound();

  const crumbs = breadcrumbsFor(locale, match);

  return (
    <div>
      <Breadcrumbs items={crumbs} />
      {match.type === "category" && <CategoryView locale={locale} dict={dict} category={match.category} />}
      {match.type === "subcategory" && <SubcategoryView locale={locale} dict={dict} category={match.category} subcategory={match.subcategory} />}
      {match.type === "plp" && (
        <PlpView locale={locale} dict={dict} category={match.category} subcategory={match.subcategory} productType={match.productType} />
      )}
      {match.type === "audience" && (
        <AudienceView locale={locale} dict={dict} category={match.category} productType={match.productType} audience={match.audience} />
      )}
      {match.type === "pdp" && (
        <PdpView
          locale={locale}
          dict={dict}
          category={match.category}
          subcategory={match.subcategory}
          productType={match.productType}
          pdpSlug={match.pdpSlug}
        />
      )}
    </div>
  );
}
