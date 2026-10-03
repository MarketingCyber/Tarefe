import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { EmptyState } from "@/components/feedback/EmptyState";
import { UsersThree } from "@phosphor-icons/react/dist/ssr";
import { canAccessPipeline } from "@/lib/permissions";

/**
 * Phase 8.1/8.2 — the CRM's "Customers" list, one row per registered
 * account, linking to the Customer 360 view. Distinct from Leads (which
 * are pre-account and may never convert) — this only lists people who
 * actually signed up.
 */
export default async function OpsCustomersPage() {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contracts: true, serviceRequests: true, applications: true } },
    },
    take: 100,
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">مشتریان</h1>
      <p className="mt-1 text-sm text-secondary">حساب‌های ثبت‌شده — هرکسی که قرارداد، درخواست یا تیکتی دارد، همین‌جا در یک پروفایل واحد قابل‌مشاهده است.</p>

      {customers.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={UsersThree} title="هنوز حساب مشتری‌ای ثبت نشده" body="هرکسی که ثبت‌نام کند، همراه با قراردادها و تیکت‌هایش همین‌جا نمایش داده می‌شود." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">نام</th>
                <th className="px-4 py-3 text-start font-medium">اطلاعات تماس</th>
                <th className="px-4 py-3 text-start font-medium">قراردادها</th>
                <th className="px-4 py-3 text-start font-medium">درخواست‌ها</th>
                <th className="px-4 py-3 text-start font-medium">تیکت‌ها</th>
                <th className="px-4 py-3 text-start font-medium">تاریخ عضویت</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-purple-900">
                    <Link href={`/ops/customers/${c.id}`} className="hover:text-purple-600 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="font-latin px-4 py-3 text-xs text-secondary">
                    {c.email}
                    <br />
                    {c.phone ?? ""}
                  </td>
                  <td className="px-4 py-3 text-secondary">{c._count.contracts}</td>
                  <td className="px-4 py-3 text-secondary">{c._count.applications}</td>
                  <td className="px-4 py-3 text-secondary">{c._count.serviceRequests}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{c.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
