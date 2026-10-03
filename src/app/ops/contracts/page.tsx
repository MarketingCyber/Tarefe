import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import { CONTRACT_STATUS_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRING: "warning",
  CANCELLED: "danger",
};

type DeadlineBucket = "overdue" | "today" | "week" | "month" | "later";

const BUCKET_LABEL: Record<DeadlineBucket, string> = {
  overdue: "عقب‌افتاده",
  today: "امروز",
  week: "این هفته",
  month: "این ماه",
  later: "آینده",
};

const BUCKET_STYLE: Record<DeadlineBucket, string> = {
  overdue: "border-danger/40 bg-danger-bg/40",
  today: "border-warning/40 bg-warning-bg/40",
  week: "border-warning/30 bg-warning-bg/20",
  month: "border-border bg-white",
  later: "border-border bg-white",
};

/**
 * Phase 8.5 "Contract Calendar" — cancellation deadlines are the one date
 * on a Contract an advisor actually needs to act on ahead of time (unlike
 * startDate, which is just a record). Bucketed relative to today rather
 * than shown as a raw date list, since "which of these need attention
 * this week" is the actual question this answers.
 */
function bucketFor(deadline: Date): DeadlineBucket {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor((deadline.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "later";
}

export default async function OpsContractsPage() {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true, email: true } } },
    take: 100,
  });

  // A cancelled contract's own deadline no longer means anything to act on.
  const withDeadlines = contracts.filter((c) => c.cancellationDeadline && c.status !== "CANCELLED");
  const buckets: Record<DeadlineBucket, typeof contracts> = { overdue: [], today: [], week: [], month: [], later: [] };
  for (const c of withDeadlines) {
    buckets[bucketFor(c.cancellationDeadline!)].push(c);
  }
  const orderedBuckets: DeadlineBucket[] = ["overdue", "today", "week", "month", "later"];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">قراردادها</h1>
      <p className="mt-1 text-sm text-secondary">مدل واحد قرارداد، در تمام دسته‌بندی‌ها — بیمه، انرژی، ارتباطات.</p>

      {withDeadlines.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-purple-900">سررسیدهای لغو قرارداد</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedBuckets
              .filter((b) => buckets[b].length > 0)
              .map((bucket) => (
                <div key={bucket} className="rounded-2xl border border-border bg-white p-4">
                  <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-secondary">
                    {BUCKET_LABEL[bucket]} ({buckets[bucket].length})
                  </p>
                  <div className="space-y-2">
                    {buckets[bucket].map((c) => (
                      <Link key={c.id} href={`/ops/customers/${c.customer.id}`} className={`block rounded-xl border p-2.5 text-xs transition-colors hover:border-purple-600 ${BUCKET_STYLE[bucket]}`}>
                        <p className="font-semibold text-purple-900">
                          {c.provider} — {c.productName}
                        </p>
                        <p className="mt-0.5 text-secondary">
                          {c.customer.name} · {c.cancellationDeadline!.toLocaleDateString("fa-IR", { calendar: "gregory" })}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={FileText} title="هنوز قراردادی ثبت نشده" body="با تایید یک درخواست، یک قرارداد ساخته می‌شود." />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">ارائه‌دهنده / محصول</th>
                <th className="px-4 py-3 text-start font-medium">مشتری</th>
                <th className="px-4 py-3 text-start font-medium">دسته‌بندی</th>
                <th className="px-4 py-3 text-start font-medium">قیمت</th>
                <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium">شروع</th>
                <th className="px-4 py-3 text-start font-medium">سررسید لغو</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-purple-900">
                    {c.provider} — {c.productName}
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <Link href={`/ops/customers/${c.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {c.customer.name}
                    </Link>
                    <br />
                    <span className="font-latin text-xs">{c.customer.email}</span>
                  </td>
                  <td className="px-4 py-3 text-secondary">{c.category}</td>
                  <td className="font-latin px-4 py-3 text-secondary">{c.priceMonthly ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[c.status]}>{CONTRACT_STATUS_FA[c.status] ?? c.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">{c.startDate ? c.startDate.toLocaleDateString("fa-IR", { calendar: "gregory" }) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{c.cancellationDeadline ? c.cancellationDeadline.toLocaleDateString("fa-IR", { calendar: "gregory" }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
