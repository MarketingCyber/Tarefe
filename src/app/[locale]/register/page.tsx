import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { isGoogleAuthEnabled } from "@/lib/auth";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const TITLE: Record<Locale, string> = { fa: "ثبت‌نام", de: "Registrieren", ru: "Регистрация" };
const DIVIDER: Record<Locale, string> = { fa: "یا", de: "oder", ru: "или" };
const HAVE_ACCOUNT: Record<Locale, { text: string; link: string }> = {
  fa: { text: "قبلاً حساب داری؟", link: "وارد شو" },
  de: { text: "Du hast bereits ein Konto?", link: "Anmelden" },
  ru: { text: "Уже есть аккаунт?", link: "Войти" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: TITLE[locale as Locale], robots: { index: false } };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const title = TITLE[locale];
  const googleEnabled = isGoogleAuthEnabled();

  return (
    <div>
      <SimplePageHeader items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: title, href: `/${locale}/register` }]} title={title} />
      <div className="container-page max-w-sm py-12">
        <Suspense fallback={null}>
          <div className="grid gap-4">
            {googleEnabled && (
              <>
                <GoogleSignInButton locale={locale} />
                <div className="flex items-center gap-3 text-xs text-secondary">
                  <span className="h-px flex-1 bg-border" />
                  {DIVIDER[locale]}
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            <RegisterForm locale={locale} />
          </div>
        </Suspense>
        <p className="mt-5 text-center text-sm text-secondary">
          {HAVE_ACCOUNT[locale].text}{" "}
          <Link href={`/${locale}/login`} className="font-semibold text-purple-600 hover:underline">
            {HAVE_ACCOUNT[locale].link}
          </Link>
        </p>
      </div>
    </div>
  );
}
