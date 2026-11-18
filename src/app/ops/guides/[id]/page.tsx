import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateGuide } from "@/lib/guide-actions";
import { GuideForm } from "@/components/crm/GuideForm";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function EditGuidePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { error } = await searchParams;
  const guide = await prisma.guide.findUnique({ where: { id } });
  if (!guide) notFound();

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/guides" />
      <h1 className="text-2xl font-bold text-purple-900">{t("ویرایش راهنما")}</h1>
      <div className="mt-6">
        <GuideForm action={updateGuide} guide={guide} error={error} submitLabel={t("ذخیره تغییرات")} />
      </div>
    </div>
  );
}
