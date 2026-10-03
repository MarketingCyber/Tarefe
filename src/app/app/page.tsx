import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, PlusCircle } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CONTRACT_STATUS_FA } from "@/lib/status-labels";

export default async function PortalDashboard() {
  const session = await auth();
  // The layout above already redirects unauthenticated visitors, but
  // `session!.user!.id!` (non-null assertions — no runtime check at all)
  // used to sit here instead. auth() has been observed returning null on
  // this exact page right after a fresh login (a cookie-propagation race
  // between the sign-in response and the immediate client-side redirect),
  // which crashed the render — and since LoginForm never reset its
  // loading state on this failure path either, that crash was showing up
  // to users as the login button freezing forever. Redirecting here too,
  // rather than trusting the layout's guarantee, closes that race.
  if (!session?.user?.id) redirect("/login?callbackUrl=/app");
  const userId = session.user.id;

  const [contracts, openRequests] = await Promise.all([
    prisma.contract.findMany({ where: { customerId: userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.serviceRequest.count({ where: { customerId: userId, status: { not: "COMPLETED" } } }),
  ]);

  return (
    <div dir="rtl" className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">سلام {session?.user?.name} 👋</h1>
      <p className="mt-1 text-sm text-secondary">خلاصه وضعیت قراردادها و درخواست‌های شما</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs text-secondary">قراردادهای فعال</p>
          <p className="font-latin mt-1 text-2xl font-bold text-purple-900">{contracts.filter((c) => c.status === "ACTIVE").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs text-secondary">درخواست‌های باز</p>
          <p className="font-latin mt-1 text-2xl font-bold text-purple-900">{openRequests}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-xs text-secondary">مجموع قراردادها</p>
          <p className="font-latin mt-1 text-2xl font-bold text-purple-900">{contracts.length}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-purple-900">قراردادهای اخیر</h2>
          <Link href="/app/contracts" className="text-sm font-semibold text-purple-600">
            مشاهده همه
          </Link>
        </div>

        {contracts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-tint py-14 text-center">
            <FileText size={32} className="text-secondary" />
            <p className="text-sm font-medium text-purple-900">هنوز قراردادی ثبت نشده</p>
            <p className="max-w-[36ch] text-xs text-secondary">
              وقتی از طریق تعرفه قراردادی برای بیمه، انرژی یا اینترنت ثبت کنی، اینجا نمایش داده می‌شود.
            </p>
            <Link href="/fa/services" className="press mt-2 inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white">
              <PlusCircle size={14} />
              مشاهده خدمات
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-purple-900">
                    {c.provider} — {c.productName}
                  </p>
                  <p className="text-xs text-secondary">{c.category}</p>
                </div>
                <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-[11px] font-medium text-success">{CONTRACT_STATUS_FA[c.status] ?? c.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
