import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { byLocale, type Category, type Subcategory, type Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { getSubcategoryQualificationConfig } from "@/lib/qualification-registry";
import { QualificationWizard } from "@/components/forms/QualificationWizard";

export function SubcategoryView({
  locale,
  dict,
  category,
  subcategory,
}: {
  locale: Locale;
  dict: Dictionary;
  category: Category;
  subcategory: Subcategory;
}) {
  const subQualification = getSubcategoryQualificationConfig(category.slug, subcategory.slug);
  const subQualificationKey = `${category.slug}/${subcategory.slug}`;

  return (
    <div className="container-page py-10">
      {subcategory.classification && (
        <span className="mb-3 inline-block rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-semibold text-purple-600">{subcategory.classification}</span>
      )}
      <h1 className="text-3xl font-bold text-purple-900 md:text-4xl">{byLocale(locale, subcategory.title)}</h1>
      <p className="mt-3 max-w-[60ch] text-secondary">{byLocale(locale, subcategory.description)}</p>

      {subQualification && (
        <div className="mt-8 max-w-xl">
          <h2 className="mb-3 text-lg font-bold text-purple-900">{subQualification.title[locale]}</h2>
          <QualificationWizard locale={locale} qualificationId={subQualificationKey} consultationHref={`/${locale}/consultation/${category.slug}`} />
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subcategory.productTypes.map((pt) => (
          <Link
            key={pt.slug}
            href={`/${locale}/services/${category.slug}/${subcategory.slug}/${pt.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <h2 className="text-base font-bold text-purple-900">{byLocale(locale, pt.title)}</h2>
            <p className="text-xs text-secondary">{byLocale(locale, pt.description)}</p>
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600">
              {byLocale(locale, { fa: "بیشتر بدان", de: "Mehr erfahren", ru: "Подробнее" })}
              <ArrowRight size={12} weight="bold" className="rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
