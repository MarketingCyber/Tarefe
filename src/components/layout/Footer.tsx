import Link from "next/link";
import { CheckCircle, InstagramLogo, YoutubeLogo, WhatsappLogo, Phone, MapPin, AppleLogo, GooglePlayLogo } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import { byLocale, getSubcategory } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { Logo } from "./Logo";
import { TrackedPhoneLink } from "@/components/shared/TrackedPhoneLink";
import { CookieConsentControl } from "@/components/shared/CookieConsentControl";

export function Footer({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const year = new Date().getFullYear();
  const pkv = getSubcategory("insurance", "health")?.productTypes.find((p) => p.slug === "pkv");
  const gkv = getSubcategory("insurance", "health")?.productTypes.find((p) => p.slug === "gkv");
  const dental = getSubcategory("insurance", "health")?.productTypes.find((p) => p.slug === "dental");

  return (
    <footer className="border-t border-border bg-tint">
      <div className="container-page grid grid-cols-2 gap-8 py-14 md:grid-cols-6">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 max-w-[32ch] text-sm leading-relaxed text-secondary">
            {locale === "fa"
              ? "پلتفرم مقایسه، مشاوره و مدیریت قراردادهای بیمه و انرژی برای فارسی‌زبانان مقیم آلمان."
              : locale === "de"
                ? "Vergleichs- und Beratungsplattform für Versicherung und Energie."
                : "Платформа сравнения и консультаций по страхованию и энергии."}
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-600/10 px-3 py-1 text-xs font-bold text-purple-900">
            <CheckCircle size={14} weight="fill" className="text-success" aria-hidden />
            {dict.cta.freeClaim}
          </p>
          <div className="mt-5 flex items-center gap-3 text-secondary">
            <a href="https://www.instagram.com/tarefe_de/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="transition-colors hover:text-purple-600">
              <InstagramLogo size={20} />
            </a>
            <a href="https://www.youtube.com/@eshaghi." target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="transition-colors hover:text-purple-600">
              <YoutubeLogo size={20} />
            </a>
            <a href="https://wa.me/4915224318691" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="transition-colors hover:text-purple-600">
              <WhatsappLogo size={20} />
            </a>
          </div>

          <p className="mt-5 text-xs font-semibold text-purple-900">{byLocale(locale, { fa: "اپلیکیشن ما", de: "Unsere App", ru: "Наше приложение" })}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <a
              href="https://apps.apple.com/de/app/tarefe/id6748063999"
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-medium text-body transition-colors hover:border-purple-600 hover:text-purple-600"
            >
              <AppleLogo size={16} weight="fill" />
              App Store
            </a>
            <a
              href="https://play.google.com/store/search?q=tarefe&c=apps"
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-medium text-body transition-colors hover:border-purple-600 hover:text-purple-600"
            >
              <GooglePlayLogo size={16} weight="fill" />
              Google Play
            </a>
          </div>
        </div>

        <FooterColumn title={dict.footer.services}>
          <FooterLink href={`/${locale}/services/insurance`}>{byLocale(locale, { fa: "بیمه", de: "Versicherung", ru: "Страхование" })}</FooterLink>
          <FooterLink href={`/${locale}/services/energy`}>{byLocale(locale, { fa: "انرژی", de: "Energie", ru: "Энергия" })}</FooterLink>
        </FooterColumn>

        <FooterColumn title={dict.footer.popularServices}>
          {pkv && <FooterLink href={`/${locale}/services/insurance/health/pkv`}>{byLocale(locale, pkv.title)}</FooterLink>}
          {gkv && <FooterLink href={`/${locale}/services/insurance/health/gkv`}>{byLocale(locale, gkv.title)}</FooterLink>}
          {dental && <FooterLink href={`/${locale}/services/insurance/health/dental`}>{byLocale(locale, dental.title)}</FooterLink>}
          <FooterLink href={`/${locale}/services/energy/electricity`}>{byLocale(locale, { fa: "برق", de: "Strom", ru: "Электричество" })}</FooterLink>
          <FooterLink href={`/${locale}/services/energy/gas`}>{byLocale(locale, { fa: "گاز", de: "Gas", ru: "Газ" })}</FooterLink>
        </FooterColumn>

        <FooterColumn title={dict.footer.company}>
          <FooterLink href={`/${locale}/about`}>{dict.footer.about}</FooterLink>
          <FooterLink href={`/${locale}/contact`}>{dict.footer.contact}</FooterLink>
        </FooterColumn>

        <FooterColumn title={dict.footer.support}>
          <FooterLink href={`/${locale}/faq`}>{dict.nav.faq}</FooterLink>
          <FooterLink href="https://wa.me/4915224318691">{dict.footer.whatsapp}</FooterLink>
          <FooterLink href={`/${locale}/consultation`}>{dict.nav.consultation}</FooterLink>
        </FooterColumn>
      </div>

      <div className="container-page flex flex-col gap-4 border-t border-border py-6 text-xs text-secondary md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <FooterLink href={`/${locale}/imprint`}>{dict.footer.imprint}</FooterLink>
          <FooterLink href={`/${locale}/privacy-policy`}>{dict.footer.privacy}</FooterLink>
          <FooterLink href={`/${locale}/terms`}>{dict.footer.terms}</FooterLink>
          <FooterLink href={`/${locale}/cookie-policy`}>{dict.footer.cookiePolicy}</FooterLink>
          <CookieConsentControl variant="link" label={dict.cookieConsent.settings} />
          {/* "My Tarefe" link intentionally removed — the customer-dashboard
              feature isn't publicly launched yet. dict.footer.myTarefe kept
              defined (unused) so this is a one-line re-add later. */}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} /> Kesselstraße 3, 40221 Düsseldorf
          </span>
          <TrackedPhoneLink locale={locale} className="inline-flex items-center gap-1.5 font-latin transition-colors hover:text-purple-600">
            <Phone size={14} /> +49 211 5421 8000
          </TrackedPhoneLink>
          <span>
            © {year} Tarefe. {dict.footer.rights}
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-purple-900">{title}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-secondary transition-colors hover:text-purple-600 [overflow-wrap:anywhere]">
        {children}
      </Link>
    </li>
  );
}
