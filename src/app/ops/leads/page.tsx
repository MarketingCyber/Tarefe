import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Funnel } from "@phosphor-icons/react/dist/ssr";
import { LEAD_STATUS_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "purple",
  CONTACTED: "neutral",
  QUALIFIED: "success",
  CONSULTATION_SCHEDULED: "warning",
  APPLICATION_STARTED: "warning",
  APPLICATION_SUBMITTED: "warning",
  CONTRACT_ACTIVE: "success",
  LOST: "danger",
};

async function markContacted(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return;

  const leadId = formData.get("leadId") as string;
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "CONTACTED", assignedAdvisorId: session.user.id },
  });
  await prisma.activityLog.create({
    data: { entityType: "lead", entityId: leadId, action: "status_changed", note: "Marked as contacted", actorId: session.user.id, leadId },
  });
  revalidatePath("/ops/leads");
}

export default async function OpsLeadsPage() {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedAdvisor: { select: { name: true } } },
    take: 50,
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">لیدها</h1>
      <p className="mt-1 text-sm text-secondary">هر ثبت فرم مشاوره بلافاصله همین‌جا نمایش داده می‌شود.</p>

      {leads.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Funnel} title="هنوز لیدی ثبت نشده" body="با ثبت فرم مشاوره در سایت اصلی، یک لید همین‌جا نمایش داده می‌شود." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">نام</th>
                <th className="px-4 py-3 text-start font-medium">اطلاعات تماس</th>
                <th className="px-4 py-3 text-start font-medium">خدمت</th>
                <th className="px-4 py-3 text-start font-medium">منبع</th>
                <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium">مشاور</th>
                <th className="px-4 py-3 text-start font-medium">دریافت</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-purple-900">
                    <Link href={`/ops/leads/${lead.id}`} className="hover:text-purple-600 hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="font-latin px-4 py-3 text-secondary">
                    {lead.phone ?? "—"}
                    <br />
                    {lead.email ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    {lead.category ?? "—"} {lead.serviceSlug ? `/ ${lead.serviceSlug}` : ""}
                  </td>
                  <td className="font-latin px-4 py-3 text-xs text-secondary">{lead.sourcePage ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[lead.status]}>{LEAD_STATUS_FA[lead.status] ?? lead.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-secondary">{lead.assignedAdvisor?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{lead.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</td>
                  <td className="px-4 py-3">
                    {lead.status === "NEW" && (
                      <form action={markContacted}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <Button type="submit" variant="secondary">
                          تماس گرفته شد
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
