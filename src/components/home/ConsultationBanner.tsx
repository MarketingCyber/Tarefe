import Link from "next/link";
import { WhatsappLogo, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { MagneticCta } from "@/components/shared/MagneticCta";

export function ConsultationBanner({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="border-y border-border bg-purple-900 py-14">
      <div className="container-page flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-start">
        <div>
          <h2 className="text-xl font-bold text-white md:text-2xl">{dict.cta.whatsappConsultation}</h2>
          <p className="mt-1.5 text-sm text-white/70">
            {locale === "fa" ? "بدون نیاز به ثبت‌نام اجباری، تماس مشاور تا چند ساعت آینده." : locale === "de" ? "Ohne Pflichtregistrierung, Rückruf in den nächsten Stunden." : "Без обязательной регистрации, звонок консультанта в ближайшие часы."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
          <MagneticCta>
            <a
              href="https://wa.me/4915224318691"
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-purple-900"
            >
              <WhatsappLogo size={18} weight="fill" />
              {dict.cta.whatsappConsultation}
            </a>
          </MagneticCta>
          <Link
            href={`/${locale}/consultation`}
            className="press inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            {dict.cta.freeConsultation}
            <ArrowRight size={14} weight="bold" className="rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
