import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessAnalytics } from "@/lib/permissions";
import { SRC_DIMS, DEV_DIMS, parseFilters, resolveRange } from "@/lib/analytics-report";
import { EVENT_TABLE_DIMS, consentShare, eventTable, landingFunnel, serverVisits, siteFunnel } from "@/lib/landing-report";
import { DashboardShell } from "@/components/analytics/DashboardShell";
import { EventsTable } from "@/components/analytics/EventsTable";
import { Toolbar } from "@/components/analytics/Toolbar";
import { ConsentCard, LandingJourneyCard, ServerVisitsSection, SiteFunnelCard } from "@/components/analytics/Panels";

/**
 * Analytics — only what needs NO cookie consent.
 *
 * Everything here is counted on our own server without cookies, storage or IP
 * addresses (lib/landing-hits.ts, /api/funnel-event, /api/landing-step), plus the real
 * lead count from the database. The older cookie-based dashboard (sessions, trends,
 * visit length, per-visitor funnel …) only ever saw the few visitors who accepted the
 * banner; its code is still in lib/analytics-*.ts but is no longer shown here.
 * The one cookie-related number kept is how many visitors accept (ConsentCard).
 */
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!canAccessAnalytics(session?.user?.role)) redirect("/ops");

  const f = parseFilters(await searchParams);
  const { range } = resolveRange(f);
  const groupBy = f.groupBy.filter((d) => (EVENT_TABLE_DIMS as readonly string[]).includes(d));
  if (groupBy.length === 0) groupBy.push("channel");
  const [server, journey, allFunnel, consent, events] = await Promise.all([serverVisits(f), landingFunnel(f), siteFunnel(f), consentShare(f), eventTable(f, groupBy)]);
  const view = { filters: f, range, server };

  return (
    <div dir="ltr" lang="en" className="container-page py-8 text-left">
      <h1 className="text-2xl font-bold text-purple-900">Analytics</h1>
      <p className="mt-1 max-w-[85ch] text-sm leading-relaxed text-secondary">
        Everyone who visits the site, where they come from, and how many become customers. All numbers on this page are counted on our server without cookies, so they do not depend on the cookie banner and cover every visitor.
        {server.firstHitAt && (
          <>
            {" "}
            Counting started on <span className="font-latin">{server.firstHitAt}</span>.
          </>
        )}
      </p>

      <DashboardShell>
        <div className="mt-6">
          <Toolbar d={{ filters: f, range }} />
        </div>

        <div className="mt-4">
          <ServerVisitsSection d={view} srcDims={SRC_DIMS} devDims={DEV_DIMS} />
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] items-start gap-x-6 gap-y-10 lg:grid-cols-2">
          <SiteFunnelCard f={allFunnel} />
          <LandingJourneyCard rows={journey} />
        </div>

        <ConsentCard c={consent} />

        <EventsTable filters={f} groupBy={groupBy} rows={events.rows} totals={events.totals} />
      </DashboardShell>

      <details className="group mt-6 rounded-2xl border border-border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-base font-bold text-purple-900 transition-colors hover:bg-tint [&::-webkit-details-marker]:hidden">
          About these numbers
          <CaretDown size={16} className="shrink-0 text-secondary transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <ul className="list-disc space-y-2 border-t border-border p-5 ps-10 text-xs leading-relaxed text-secondary">
          <li>
            <b className="text-body">How visits are counted:</b> on our server, for every full page load by a real browser. No IP address, no user-agent text and nothing on the visitor&apos;s device is stored; people are told apart only by a code that changes every day, so someone returning on another day counts as a new visitor. Bots, crawlers, prefetches, scripts and in-site navigation are excluded; your own team&apos;s visits are included. A visit is one or more page loads by the same visitor less than 30 minutes apart.
          </li>
          <li>
            <b className="text-body">Funnel and landing journey:</b> calculator use, tariff-button clicks, form starts, page views and each landing-journey step are counted the same way, once per person per day. The number of consultation requests is the real count of leads in the database.
          </li>
          <li>
            <b className="text-body">Cookie banner:</b> the percentage is how many visitors the old cookie-based tracking also saw, which means people who have accepted cookies, out of everyone who arrived. Banner clicks are counted separately from the day the click counter was added.
          </li>
          <li>
            <b className="text-body">How a visit&apos;s source is decided</b> (first match wins): ① UTM tags in the link (<span className="font-latin">utm_source</span> / <span className="font-latin">utm_medium</span>) → ② an ad click id: Google Ads <span className="font-latin">gclid</span> / <span className="font-latin">gbraid</span> / <span className="font-latin">wbraid</span> counts as <span className="font-latin">google / cpc</span>, Bing <span className="font-latin">msclkid</span> as <span className="font-latin">bing / cpc</span> → ③ the site the visitor came from: a search engine = <span className="font-latin">organic</span>, a social network = <span className="font-latin">social</span>, any other website = <span className="font-latin">referral</span> → ④ nothing at all = <span className="font-latin">(direct) / (none)</span>. Moving between pages of our own site is never a source.
          </li>
          <li>
            <b className="text-body">Ad platforms:</b> add UTM tags to every ad link so each platform and campaign shows by name; use the same spelling every time.{" "}
            <b className="text-body">Google Ads</b> is recognised even without tags while auto-tagging is on, but shows no campaign name; add the tracking template <span className="font-latin">{"{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}"}</span> in the account settings.{" "}
            <b className="text-body">Meta (Facebook / Instagram)</b> cannot tell an ad from a post without tags; in the ad&apos;s URL parameters use <span className="font-latin">{"utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}"}</span>. Any medium of <span className="font-latin">cpc, ppc, paid, paid_social, paid-social, display, cpm</span> counts as the Paid channel.
          </li>
        </ul>
      </details>
    </div>
  );
}
