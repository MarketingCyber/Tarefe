import { redirect } from "next/navigation";
import { ClipboardText } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, type BadgeTone } from "@/components/shared/Badge";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SUBMITTED: "ثبت‌شده",
  PROVIDER_REVIEW: "در حال بررسی ارائه‌دهنده",
  APPROVED: "تایید‌شده",
  REJECTED: "رد‌شده",
  CANCELLED: "لغوشده",
};
const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  SUBMITTED: "purple",
  PROVIDER_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/app/applications");

  const applications = await prisma.application.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div dir="rtl" className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">درخواست‌ها</h1>
      <p className="mt-1 text-sm text-secondary">درخواست‌های قرارداد در حال بررسی نزد ارائه‌دهنده‌ها.</p>

      {applications.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-tint py-16 text-center">
          <ClipboardText size={32} className="text-secondary" />
          <p className="text-sm font-medium text-purple-900">هنوز درخواستی ثبت نشده</p>
          <p className="max-w-[36ch] text-xs text-secondary">وقتی مشاور تعرفه یک درخواست قرارداد را برایت شروع کند، اینجا نمایش داده می‌شود.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {applications.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-purple-900">
                  {a.provider} — {a.tariffName}
                </p>
                <p className="text-xs text-secondary">
                  {a.category} {a.monthlyPrice ? `· ${a.monthlyPrice} / ماه` : ""}
                </p>
              </div>
              <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status] ?? a.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
