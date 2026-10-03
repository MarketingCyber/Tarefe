import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, type BadgeTone } from "@/components/shared/Badge";

const STATUS_LABEL: Record<string, string> = { ACTIVE: "فعال", PENDING: "در انتظار", EXPIRING: "رو به انقضا", CANCELLED: "لغوشده" };
const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRING: "warning",
  CANCELLED: "danger",
};

export default async function ContractsPage() {
  const session = await auth();
  // See PortalDashboard (app/page.tsx) — every page-level auth() call in
  // /app and /ops guards against the fresh-login race the same way now.
  if (!session?.user?.id) redirect("/login?callbackUrl=/app/contracts");

  const contracts = await prisma.contract.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div dir="rtl" className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">قراردادها</h1>
      <p className="mt-1 text-sm text-secondary">همه قراردادهای فعال و پیشین شما در یک نگاه.</p>

      {contracts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-tint py-16 text-center">
          <FileText size={32} className="text-secondary" />
          <p className="text-sm font-medium text-purple-900">هنوز قراردادی ثبت نشده</p>
          <p className="max-w-[36ch] text-xs text-secondary">وقتی از طریق تعرفه قراردادی برای بیمه، انرژی یا اینترنت ثبت کنی، اینجا نمایش داده می‌شود.</p>
          <Link href="/fa/services" className="press mt-2 inline-flex items-center rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white">
            مشاهده خدمات
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {contracts.map((c) => (
            <Link key={c.id} href={`/app/contracts/${c.id}`} className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600">
              <div>
                <p className="text-sm font-semibold text-purple-900">
                  {c.provider} — {c.productName}
                </p>
                <p className="text-xs text-secondary">
                  {c.category} {c.priceMonthly ? `· ${c.priceMonthly} / ماه` : ""}
                </p>
              </div>
              <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status] ?? c.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
