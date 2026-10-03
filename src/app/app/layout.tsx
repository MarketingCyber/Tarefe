import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inter, iransansx } from "@/lib/fonts";
import { PortalNav } from "@/components/customer/PortalNav";
import { GtmScript } from "@/components/providers/GoogleTagManager";
import { PageTransition } from "@/components/providers/PageTransition";
import { isStaffRole } from "@/lib/permissions";
import "../globals.css";

export const metadata: Metadata = {
  title: "تعرفه من",
  robots: { index: false, follow: false },
};

/**
 * Independent root layout for the customer portal (/app/*). Not
 * locale-prefixed — matches the Phase 1 decision to keep the portal and
 * internal Ops surfaces out of the public /fa|de|ru/ tree entirely, each
 * with its own root layout (Next.js "multiple root layouts" pattern).
 * Now auth-gated: any signed-in user can reach it (both customers and
 * advisors browsing as themselves), unauthenticated visitors are sent to
 * /login with a callback back here.
 *
 * `<body>` is a side-by-side flex row (PortalNav's sidebar + the page
 * content), same shape as `/ops/layout.tsx` — see PortalNav.tsx's own
 * comment for why the top ribbon was replaced with a side rail.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/app");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <html lang="fa" dir="rtl" className={`${inter.variable} ${iransansx.variable}`}>
      <GtmScript />
      <body className="flex min-h-screen antialiased">
        <PortalNav
          userName={session.user.name ?? session.user.email ?? ""}
          notifications={notifications}
          isStaff={isStaffRole(session.user.role)}
        />
        <div className="min-w-0 flex-1 bg-white">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
