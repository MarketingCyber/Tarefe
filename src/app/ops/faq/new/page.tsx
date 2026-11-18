import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createFaq } from "@/lib/faq-actions";
import { FaqForm } from "@/components/crm/FaqForm";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function NewFaqPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { error } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/faq" />
      <h1 className="text-2xl font-bold text-purple-900">{t("سوال جدید")}</h1>
      <div className="mt-6">
        <FaqForm action={createFaq} error={error} submitLabel={t("ایجاد")} />
      </div>
    </div>
  );
}
