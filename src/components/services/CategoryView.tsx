import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { byLocale, isCollapsedSubcategory, type Category, type Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";

export function CategoryView({ locale, dict, category }: { locale: Locale; dict: Dictionary; category: Category }) {
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold text-purple-900 md:text-4xl">{byLocale(locale, category.title)}</h1>
      <p className="mt-3 max-w-[60ch] text-secondary">{byLocale(locale, category.description)}</p>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {category.subcategories.map((sub) => {
          const collapsed = isCollapsedSubcategory(sub);
          return (
            <Link
              key={sub.slug}
              href={`/${locale}/services/${category.slug}/${sub.slug}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              {sub.classification && (
                <span className="w-fit rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-semibold text-purple-600">{sub.classification}</span>
              )}
              <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, sub.title)}</h2>
              <p className="text-sm text-secondary">{byLocale(locale, sub.description)}</p>
              {!collapsed && (
                <p className="mt-1 text-xs text-secondary">
                  {sub.productTypes.length} {byLocale(locale, { fa: "نوع خدمت", de: "Produkte", ru: "продукта" })}
                </p>
              )}
              <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-purple-600">
                {dict.nav.services}
                <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
