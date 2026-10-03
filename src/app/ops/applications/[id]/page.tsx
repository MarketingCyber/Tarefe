import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { updateApplicationStatus } from "@/lib/application-actions";
import { APPLICATION_STATUS_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";

const STATUS_OPTIONS = ["DRAFT", "SUBMITTED", "PROVIDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"] as const;
const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "purple",
  PROVIDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export default async function OpsApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      lead: { select: { id: true, name: true, email: true } },
      advisor: { select: { name: true } },
      contract: { select: { id: true } },
    },
  });
  if (!application) notFound();

  const activityLogs = await prisma.activityLog.findMany({
    where: { entityType: "application", entityId: application.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="container-page py-8">
      <Link href="/ops/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به درخواست‌ها
      </Link>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-purple-900">
                  {application.provider} — {application.tariffName}
                </h1>
                <p className="mt-1 text-sm text-secondary">
                  {application.customer ? (
                    <Link href={`/ops/customers/${application.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {application.customer.name}
                    </Link>
                  ) : (
                    "بدون مشتری متصل"
                  )}{" "}
                  · <span className="font-latin">{application.customer?.email}</span> · {application.category}
                  {application.monthlyPrice && ` · ${application.monthlyPrice}`}
                </p>
                {application.lead && (
                  <p className="mt-1 text-xs text-secondary">
                    از لید:{" "}
                    <Link href={`/ops/leads/${application.lead.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {application.lead.name}
                    </Link>
                  </p>
                )}
              </div>
              <Badge tone={STATUS_TONE[application.status]}>{APPLICATION_STATUS_FA[application.status] ?? application.status}</Badge>
            </div>

            {application.contract && (
              <p className="mt-4 rounded-lg bg-tint px-3 py-2 text-xs font-medium text-purple-900">
                تایید شد — قرارداد ساخته شد.{" "}
                {application.customer && (
                  <Link href={`/ops/customers/${application.customer.id}`} className="underline hover:text-purple-600">
                    مشاهده در پروفایل مشتری
                  </Link>
                )}
                .
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <form action={updateApplicationStatus} className="flex items-center gap-2">
                <input type="hidden" name="applicationId" value={application.id} />
                <select name="status" defaultValue={application.status} className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-purple-900">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {APPLICATION_STATUS_FA[s] ?? s}
                    </option>
                  ))}
                </select>
                <Button type="submit">به‌روزرسانی وضعیت</Button>
              </form>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">جزئیات</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-secondary">مشاور</dt>
                <dd className="font-medium text-purple-900">{application.advisor?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">شروع</dt>
                <dd className="text-purple-900">{application.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">آخرین به‌روزرسانی</dt>
                <dd className="text-purple-900">{application.updatedAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">فعالیت‌ها</h2>
            <ActivityTimeline entries={activityLogs} locale="fa" />
          </div>
        </div>
      </div>
    </div>
  );
}
