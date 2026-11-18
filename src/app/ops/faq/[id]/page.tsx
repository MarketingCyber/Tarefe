import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateFaq } from "@/lib/faq-actions";
import { FaqForm } from "@/components/crm/FaqForm";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function EditFaqPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { error } = await searchParams;
  const faq = await prisma.faqItem.findUnique({ where: { id } });
  if (!faq) notFound();

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/faq" />
      <h1 className="text-2xl font-bold text-purple-900">{t("ویرایش سوال")}</h1>
      <div className="mt-6">
        <FaqForm action={updateFaq} faq={faq} error={error} submitLabel={t("ذخیره تغییرات")} />
      </div>
    </div>
  );
}
