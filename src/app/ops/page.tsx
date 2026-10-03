import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline, canAccessContent, canAccessAnalytics } from "@/lib/permissions";

export default async function OpsOverview() {
  // This dashboard is entirely pipeline stats (leads/contracts/tickets) —
  // dead-end for a role that can't open any of those links. Send
  // CONTENT_EDITOR/ANALYST straight to the page that's actually theirs
  // instead of a wall of unclickable numbers. LEAD_MANAGER stays here —
  // it's exactly their content.
  const session = await auth();
  const role = session?.user?.role;
  if (!canAccessPipeline(role)) {
    if (canAccessContent(role)) redirect("/ops/guides");
    if (canAccessAnalytics(role)) redirect("/ops/analytics");
    redirect("/ops/my-work");
  }

  const weekFromNow = new Date(new Date().getTime() + 7 * 86_400_000);

  const [newLeads, totalLeads, activeContracts, openTickets, deadlinesSoon] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count(),
    prisma.contract.count({ where: { status: "ACTIVE" } }),
    prisma.serviceRequest.count({ where: { status: { not: "COMPLETED" } } }),
    // Overdue + due within a week — the same window /ops/contracts' own
    // "Overdue"/"Due today"/"Due this week" buckets cover, surfaced here
    // as one org-wide count so it doesn't need its own visit to notice.
    prisma.contract.count({ where: { cancellationDeadline: { lte: weekFromNow }, status: { not: "CANCELLED" }, NOT: { cancellationDeadline: null } } }),
  ]);

  const stats = [
    { label: "لیدهای جدید", value: newLeads, href: "/ops/leads" },
    { label: "مجموع لیدها", value: totalLeads, href: "/ops/leads" },
    { label: "قراردادهای فعال", value: activeContracts, href: "/ops/contracts" },
    { label: "تیکت‌های باز", value: openTickets, href: "/ops/tickets" },
    { label: "سررسیدهای ۷ روز آینده", value: deadlinesSoon, href: "/ops/contracts" },
  ];

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">نمای کلی عملیات</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-xl border border-border bg-white p-5 transition-colors hover:border-purple-600">
            <p className="text-xs text-secondary">{stat.label}</p>
            <p className="font-latin mt-1 text-3xl font-bold text-purple-900">{stat.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
