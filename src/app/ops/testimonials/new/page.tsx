import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createTestimonial } from "@/lib/testimonial-actions";
import { TestimonialForm } from "@/components/crm/TestimonialForm";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function NewTestimonialPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { error } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/testimonials" />
      <h1 className="text-2xl font-bold text-purple-900">{t("نظر جدید")}</h1>
      <div className="mt-6">
        <TestimonialForm action={createTestimonial} error={error} submitLabel={t("ایجاد")} />
      </div>
    </div>
  );
}
