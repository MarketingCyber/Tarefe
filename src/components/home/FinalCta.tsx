import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { MagneticCta } from "@/components/shared/MagneticCta";

export function FinalCta({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="py-16 md:py-24">
      <div className="container-page rounded-3xl bg-tint px-6 py-14 text-center md:px-12">
        <h2 className="mx-auto max-w-[20ch] text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.finalCtaTitle}</h2>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm text-secondary md:text-base">{dict.home.finalCtaSubtitle}</p>
        <MagneticCta>
          <Link
            href={`/${locale}/consultation`}
            className="press mt-7 inline-flex items-center gap-2 rounded-full bg-purple-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900"
          >
            {dict.cta.freeConsultation}
            <ArrowRight size={16} weight="bold" className="rtl:rotate-180" />
          </Link>
        </MagneticCta>
      </div>
    </section>
  );
}
