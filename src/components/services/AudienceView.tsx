import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { byLocale, type Category, type ProductAudience, type ProductType, type Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";

export function AudienceView({
  locale,
  dict,
  category,
  productType,
  audience,
}: {
  locale: Locale;
  dict: Dictionary;
  category: Category;
  productType: ProductType;
  audience: ProductAudience;
}) {
  return (
    <div className="container-page py-12 md:py-16">
      <p className="text-sm font-medium text-secondary">{byLocale(locale, productType.title)}</p>
      <h1 className="mt-1.5 text-3xl font-extrabold text-purple-900 md:text-4xl">{byLocale(locale, audience.title)}</h1>
      <p className="mt-3 max-w-[56ch] text-secondary">{byLocale(locale, audience.description)}</p>
      <Link
        href={`/${locale}/consultation/${category.slug}`}
        className="press mt-6 inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900"
      >
        {dict.cta.freeConsultation}
        <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
      </Link>
    </div>
  );
}
