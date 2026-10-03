import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { LoginForm } from "@/components/auth/LoginForm";
import { isGoogleAuthEnabled } from "@/lib/auth";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const NO_ACCOUNT: Record<Locale, { text: string; link: string }> = {
  fa: { text: "حساب نداری؟", link: "ثبت‌نام کن" },
  de: { text: "Du hast noch kein Konto?", link: "Registrieren" },
  ru: { text: "Нет аккаунта?", link: "Зарегистрироваться" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.nav.login, robots: { index: false } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <div>
      <SimplePageHeader items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: dict.nav.login, href: `/${locale}/login` }]} title={dict.nav.login} />
      <div className="container-page max-w-sm py-12">
        <Suspense fallback={null}>
          <LoginForm locale={locale} googleEnabled={isGoogleAuthEnabled()} />
        </Suspense>
        <p className="mt-5 text-center text-sm text-secondary">
          {NO_ACCOUNT[locale].text}{" "}
          <Link href={`/${locale}/register`} className="font-semibold text-purple-600 hover:underline">
            {NO_ACCOUNT[locale].link}
          </Link>
        </p>
      </div>
    </div>
  );
}
