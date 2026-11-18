import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportProblemButton } from "@/components/crm/ReportProblemButton";
import { OpsNavTracker } from "@/components/crm/BackLink";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inter, iransansx } from "@/lib/fonts";
import { OpsNav } from "@/components/crm/OpsNav";
import { GtmScript } from "@/components/providers/GoogleTagManager";
import { PageTransition } from "@/components/providers/PageTransition";
import { isStaffRole } from "@/lib/permissions";
import { isAppEnabled } from "@/lib/app-flag";
import { getOpsI18n } from "@/lib/ops-i18n/server";
import { OpsI18nProvider } from "@/lib/ops-i18n/client";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getOpsI18n();
  return { title: t("پنل عملیات | تعرفه"), robots: { index: false, follow: false } };
}

/**
 * Independent root layout for internal Ops/CRM (/ops/*). Own root layout,
 * separate from the public site and the customer portal — never
 * locale-prefixed, never linked from public nav, disallowed in robots.txt,
 * and gated by role: any of the five staff roles gets past this layout (a
 * customer session gets redirected, not just hidden nav) — which ones can
 * reach which *page* is a separate, narrower check each page makes for
 * itself via src/lib/permissions.ts.
 *
 * `<body>` is a side-by-side flex row (OpsNav's sidebar + the page content)
 * rather than a stacked header-then-content column — see OpsNav.tsx's own
 * comment for why the old top ribbon was replaced with a side rail.
 */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/ops");
  if (!isStaffRole(session.user.role)) redirect("/app");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Language + direction from the staff member's choice (side-menu switch, cookie): fa right-to-left, en / de left-to-right.
  const { locale, dir } = await getOpsI18n();

  return (
    <html lang={locale} dir={dir} className={`ops-theme ${inter.variable} ${iransansx.variable}`}>
      <GtmScript />
      <body className="flex min-h-screen antialiased">
        <OpsI18nProvider locale={locale}>
        <OpsNav userName={session.user.name ?? session.user.email ?? ""} notifications={notifications} role={session.user.role ?? "ADVISOR"} appEnabled={isAppEnabled()} />
        <div className="@container min-w-0 flex-1 bg-tint">
          <PageTransition>{children}</PageTransition>
        </div>
        {/* QC during the parallel run: every CRM page can send a problem report to /ops/qc. */}
        <Suspense fallback={null}>
          <ReportProblemButton />
          <OpsNavTracker />
        </Suspense>
        </OpsI18nProvider>
      </body>
    </html>
  );
}
