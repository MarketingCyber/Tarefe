import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText, Headset } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "فعال", PENDING: "در انتظار", EXPIRING: "رو به انقضا", CANCELLED: "لغوشده" };
const REQUEST_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "دریافت‌شده",
  UNDER_REVIEW: "در حال بررسی",
  SENT_TO_PROVIDER: "ارسال‌شده به ارائه‌دهنده",
  PROVIDER_PROCESSING: "در حال پردازش",
  COMPLETED: "تکمیل‌شده",
};

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/app/contracts/${id}`);

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { uploadedAt: "desc" } },
      serviceRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!contract || contract.customerId !== session.user.id) notFound();

  return (
    <div dir="rtl" className="container-page py-8">
      <Link href="/app/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به قراردادها
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-purple-900">
              {contract.provider} — {contract.productName}
            </h1>
            <p className="mt-1 text-sm text-secondary">{contract.category}</p>
          </div>
          <span className="shrink-0 rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-medium text-purple-900">{STATUS_LABEL[contract.status] ?? contract.status}</span>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-secondary">شماره قرارداد</dt>
            <dd className="font-latin mt-0.5 text-body">{contract.contractNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">هزینه ماهانه</dt>
            <dd className="font-latin mt-0.5 text-body">{contract.priceMonthly ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">تاریخ شروع</dt>
            <dd className="mt-0.5 text-body">{contract.startDate ? contract.startDate.toLocaleDateString("fa-IR", { calendar: "gregory" }) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-secondary">مهلت فسخ</dt>
            <dd className="mt-0.5 text-body">{contract.cancellationDeadline ? contract.cancellationDeadline.toLocaleDateString("fa-IR", { calendar: "gregory" }) : "—"}</dd>
          </div>
        </dl>

        <Link
          href={`/app/support?contractId=${contract.id}`}
          className="press mt-6 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-900"
        >
          <Headset size={16} />
          درخواست پشتیبانی برای این قرارداد
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-purple-900">
          <FileText size={16} />
          مدارک
        </h2>
        {contract.documents.length === 0 ? (
          <p className="text-sm text-secondary">هنوز مدرکی برای این قرارداد ثبت نشده.</p>
        ) : (
          <ul className="space-y-2">
            {contract.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span className="text-body">{doc.title}</span>
                {doc.fileUrl ? (
                  <a href={`/api/documents/${doc.id}`} className="text-xs font-semibold text-purple-600 hover:text-purple-900">
                    دانلود
                  </a>
                ) : (
                  <span className="text-xs text-secondary">در حال آماده‌سازی</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {contract.serviceRequests.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-purple-900">درخواست‌های پشتیبانی مرتبط</h2>
          <ul className="space-y-2">
            {contract.serviceRequests.map((r) => (
              <li key={r.id}>
                <Link href={`/app/support/${r.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-colors hover:border-purple-600">
                  <span className="text-body">{r.subject}</span>
                  <span className="text-xs text-secondary">{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
