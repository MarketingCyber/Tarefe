import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ClipboardText } from "@phosphor-icons/react/dist/ssr";
import { APPLICATION_STATUS_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "purple",
  PROVIDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export default async function OpsApplicationsPage() {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const applications = await prisma.application.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true, email: true } }, lead: { select: { name: true, email: true } }, advisor: { select: { name: true } } },
    take: 100,
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">درخواست‌ها</h1>
      <p className="mt-1 text-sm text-secondary">درخواست‌های قرارداد در جریان با یک ارائه‌دهنده، از پیش‌نویس تا تایید نهایی.</p>

      {applications.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={ClipboardText} title="هنوز درخواستی ثبت نشده" body="با پیش‌رفتن یک لید واجد شرایط با ارائه‌دهنده، یک درخواست ساخته می‌شود." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">ارائه‌دهنده / تعرفه</th>
                <th className="px-4 py-3 text-start font-medium">متقاضی</th>
                <th className="px-4 py-3 text-start font-medium">دسته‌بندی</th>
                <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium">مشاور</th>
                <th className="px-4 py-3 text-start font-medium">شروع</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => {
                const applicant = a.customer ?? a.lead;
                return (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-purple-900">
                      <Link href={`/ops/applications/${a.id}`} className="hover:text-purple-600 hover:underline">
                        {a.provider} — {a.tariffName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-secondary">
                      {a.customer ? (
                        <Link href={`/ops/customers/${a.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                          {a.customer.name}
                        </Link>
                      ) : (
                        (applicant?.name ?? "—")
                      )}
                      <br />
                      <span className="font-latin text-xs">{applicant?.email ?? ""}</span>
                    </td>
                    <td className="px-4 py-3 text-secondary">{a.category}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[a.status]}>{APPLICATION_STATUS_FA[a.status] ?? a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-secondary">{a.advisor?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-secondary">{a.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
