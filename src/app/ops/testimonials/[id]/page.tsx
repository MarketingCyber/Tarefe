import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateTestimonial } from "@/lib/testimonial-actions";
import { TestimonialForm } from "@/components/crm/TestimonialForm";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function EditTestimonialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { error } = await searchParams;
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) notFound();

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/testimonials" />
      <h1 className="text-2xl font-bold text-purple-900">{t("ویرایش نظر")}</h1>
      <div className="mt-6">
        <TestimonialForm action={updateTestimonial} testimonial={testimonial} error={error} submitLabel={t("ذخیره تغییرات")} />
      </div>
    </div>
  );
}
