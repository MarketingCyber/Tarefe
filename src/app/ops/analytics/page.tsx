import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccessAnalytics } from "@/lib/permissions";
import { METRICS, SRC_DIMS, DEV_DIMS, breakdownFor, filtersToQuery, parseFilters, resolveRange, webVitalSamples, type Dim, type MetricKey, type TrendKpi } from "@/lib/analytics-report";
import { buildDashboard } from "@/lib/analytics-dashboard";
import { landingFunnel } from "@/lib/landing-report";
import { DashboardShell, NavLink } from "@/components/analytics/DashboardShell";
import { Toolbar } from "@/components/analytics/Toolbar";
import { StatTiles } from "@/components/analytics/StatTiles";
import { TrendCard, type Tab } from "@/components/analytics/TrendCard";
import { DevicesCard, EventsCard, FunnelCard, Insights, LandingCard, LandingJourneyCard, ServerVisitsSection, SourcesCard } from "@/components/analytics/Panels";
import { AdvancedSection } from "@/components/analytics/Advanced";
import { DIM_LABEL, KPI_PLAIN, dimValueLabel } from "@/components/analytics/labels";

/**
 * Analytics dashboard (v2, 2026-10-15) — rebuilt around questions, not controls.
 *
 *   one slim toolbar  →  a plain-language summary  →  headline tiles
 *   →  one trend  →  "where from / how many convert / which pages / which
 *   device / what do they do"  →  collapsed power tools.
 *
 * Every filter, tab and range is a LINK to this same page with different
 * query params (see DashboardShell): there are no Apply buttons, the URL is
 * the entire state, and any view can be bookmarked or shared. The engine is
 * unchanged from the explorer (lib/analytics-report.ts — read its header for
 * what a "session" is and the honest limits); this page only chooses what to
 * show and says it in plain words.
 */
export const dynamic = "force-dynamic";

const TREND_TABS: TrendKpi[] = ["sessions", "users", "leads_crm", "conv_rate", "median_duration", "pages_per_session"];
const SPLIT_DIMS: Dim[] = ["channel", "source", "device", "locale", "landing_group", "visitor_type"];

const VITAL_ORDER = ["LCP", "INP", "CLS", "FCP", "TTFB"];
const VITAL_LABEL: Record<string, string> = { LCP: "Main content load", INP: "Response to clicks", CLS: "Layout stability", FCP: "First paint", TTFB: "Server response" };

function formatVital(name: string, v: number): string {
  if (name === "CLS") return v.toFixed(3);
  return v >= 1000 ? `${(v / 1000).toFixed(2)}s` : `${Math.round(v)}ms`;
}
const percentile = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth();
  if (!canAccessAnalytics(session?.user?.role)) redirect("/ops");

  const f = parseFilters(await searchParams);
  const { range } = resolveRange(f);
  const [d, adv, vitalRows, journey] = await Promise.all([
    buildDashboard(f),
    f.adv ? breakdownFor(f, range) : Promise.resolve(null),
    webVitalSamples(range),
    landingFunnel(f),
  ]);

  // ---------------------------------------------------------------- trend card props
  const kpi = f.trendKpis[0];
  const meta = KPI_PLAIN[kpi] ?? { label: METRICS[kpi as MetricKey].label, hint: METRICS[kpi as MetricKey].hint };
  const format = kpi === "leads_crm" ? "int" : METRICS[kpi as MetricKey].format;
  const href = (over: Record<string, string | undefined>) => `?${filtersToQuery(f, over)}`;
  const trendTabs: Tab[] = TREND_TABS.map((k) => ({ label: KPI_PLAIN[k].label, href: href({ kpi: k, k: k }), active: kpi === k }));
  const splitOptions: Tab[] = [
    { label: "No split", href: href({ split: undefined }), active: !f.trendSplit },
    ...SPLIT_DIMS.map((dim) => ({ label: DIM_LABEL[dim], href: href({ split: dim }), active: f.trendSplit === dim })),
  ];
  const series = d.trend.series.map((s) => ({
    name: f.trendSplit ? (s.name === "Other" ? "Other" : dimValueLabel(f.trendSplit, s.name)) : meta.label,
    values: s.values,
    previous: s.previous,
  }));

  // ---------------------------------------------------------------- web vitals
  const vitals: Record<string, { value: number; rating: string }[]> = {};
  for (const row of vitalRows) {
    const m = row.metadata as { name?: string; value?: number; rating?: string } | null;
    if (m?.name && typeof m.value === "number") (vitals[m.name] ??= []).push({ value: m.value, rating: m.rating ?? "" });
  }
  const vitalStats = VITAL_ORDER.filter((n) => vitals[n]?.length).map((n) => {
    const s = vitals[n];
    const sorted = s.map((x) => x.value).sort((a, b) => a - b);
    return { name: n, p75: percentile(sorted, 0.75), good: Math.round((s.filter((x) => x.rating === "good").length / s.length) * 100), count: s.length };
  });

  return (
    <div dir="ltr" lang="en" className="container-page py-8 text-left">
      <h1 className="text-2xl font-bold text-purple-900">Analytics</h1>
      <p className="mt-1 max-w-[85ch] text-sm leading-relaxed text-secondary">
        Who visits the site, where they come from, and how many become customers. Only visitors who accepted cookies are tracked, so these numbers are a sample of the traffic, not all of it.
        {d.trackedSince && (
          <>
            {" "}
            Data available since <span className="font-latin">{d.trackedSince}</span>.
          </>
        )}
      </p>

      <DashboardShell>
        <div className="mt-6">
          <Toolbar d={d} />
        </div>

        <div className="mt-6">
          <Insights lines={d.insights} />
        </div>

        <div className="mt-4">
          <ServerVisitsSection d={d} srcDims={SRC_DIMS} devDims={DEV_DIMS} />
        </div>

        <LandingJourneyCard rows={journey} />

        <h2 className="mt-10 text-lg font-bold text-purple-900">Visitors who accepted cookies</h2>
        <p className="mt-0.5 max-w-[85ch] text-xs leading-relaxed text-secondary">
          Everything below comes from cookie-based tracking, so it only covers visitors who accepted the cookie banner. It adds what the section above cannot see: pages per visit, visit length, the funnel, forms and clicks.
        </p>

        {!d.hasData ? (
          <div className="mt-4 rounded-2xl border border-border bg-tint px-6 py-10 text-center">
            <p className="text-base font-semibold text-purple-900">No cookie-tracked visits in this period</p>
            <p className="mt-1 text-sm text-secondary">Nobody who accepted cookies visited in this period, or the filters exclude them. Choose a longer period or remove some filters.</p>
            <div className="mt-4 flex justify-center gap-2">
              <NavLink href={href({ p: "90d", from: undefined, to: undefined })} className="press rounded-full bg-purple-600 px-5 py-2 text-sm font-semibold text-white hover:bg-purple-900">
                Last 90 days
              </NavLink>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4">
              <StatTiles d={d} />
              {d.compareEmpty && (
                <p className="mt-3 rounded-lg bg-tint px-3 py-2 text-xs text-secondary">
                  The previous period (<span className="font-latin">{d.previous.from}</span> to <span className="font-latin">{d.previous.to}</span>) has no tracked visits, so there is nothing to compare with.
                </p>
              )}
            </div>

            <div className="mt-6">
              <TrendCard
                title={meta.label}
                hint={meta.hint}
                format={format}
                buckets={d.trend.buckets}
                unit={d.trend.unit}
                series={series}
                tabs={trendTabs}
                splitLabel={f.trendSplit ? `Split by: ${DIM_LABEL[f.trendSplit]}` : "Split lines"}
                splitOptions={splitOptions}
                compare={f.compare && !d.compareEmpty}
                note={d.trend.leadsUnavailable ? "CRM leads cannot be shown with this filter or split because the leads table does not store that information." : undefined}
              />
            </div>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
              <SourcesCard d={d} dims={SRC_DIMS} />
              <FunnelCard d={d} />
              <LandingCard d={d} />
              <DevicesCard d={d} dims={DEV_DIMS} />
              <EventsCard d={d} />
            </div>
          </>
        )}

        <div className="mt-8">
          <AdvancedSection filters={f} eventNames={d.options.events} breakdown={adv} totals={adv ? d.totals : null} />
        </div>
      </DashboardShell>

      <details className="group mt-4 rounded-2xl border border-border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-base font-bold text-purple-900 transition-colors hover:bg-tint [&::-webkit-details-marker]:hidden">
          Site performance and speed
          <CaretDown size={16} className="shrink-0 text-secondary transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-5">
          {vitalStats.length === 0 ? (
            <p className="text-sm text-secondary">No samples recorded in this period yet.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-secondary">p75 (75% of visits were faster than this value). Only the date range applies here.</p>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {vitalStats.map((v) => (
                  <div key={v.name} className="rounded-xl bg-tint p-3">
                    <p className="text-xs text-secondary">{VITAL_LABEL[v.name]}</p>
                    <p className="font-latin mt-1 text-xl font-bold text-purple-900">{formatVital(v.name, v.p75)}</p>
                    <p className={`mt-1 text-xs font-medium ${v.good >= 75 ? "text-success" : v.good >= 50 ? "text-warning" : "text-danger"}`}>{v.good}% good</p>
                    <p className="font-latin text-[10px] text-secondary">
                      {v.name} · {v.count} samples
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </details>

      <details className="group mt-4 rounded-2xl border border-border bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 py-4 text-base font-bold text-purple-900 transition-colors hover:bg-tint [&::-webkit-details-marker]:hidden">
          About these numbers
          <CaretDown size={16} className="shrink-0 text-secondary transition-transform duration-150 group-open:rotate-180" />
        </summary>
        <ul className="list-disc space-y-2 border-t border-border p-5 ps-10 text-xs leading-relaxed text-secondary">
          <li>
            <b className="text-body">All visits (no cookies):</b> the first section is counted on our server for every full page load by a real browser. It stores no IP address, no user-agent text and nothing on the visitor&apos;s device; people are told apart only by a code that changes every day. Bots, crawlers, prefetches and in-site navigation are excluded, and your own team&apos;s visits are included. A visit is one or more page loads by the same visitor less than 30 minutes apart. Counting started on the day this was released, so earlier days are empty.
          </li>
          <li>
            <b className="text-body">Cookie consent:</b> visitors who have not accepted cookies are not tracked at all, so visit numbers are a sample. The lead count (CRM) comes from the leads table and is complete.
          </li>
          <li>
            <b className="text-body">How a visit&apos;s source is decided</b> (first match wins): ① UTM tags in the link (<span className="font-latin">utm_source</span> / <span className="font-latin">utm_medium</span>) → ② an ad click id: Google Ads <span className="font-latin">gclid</span> / <span className="font-latin">gbraid</span> / <span className="font-latin">wbraid</span> counts as <span className="font-latin">google / cpc</span> (campaign shown as &quot;(auto-tagged)&quot; unless you also add <span className="font-latin">utm_campaign</span>), Bing <span className="font-latin">msclkid</span> as <span className="font-latin">bing / cpc</span> → ③ the site the visitor came from: a search engine = <span className="font-latin">organic</span>, a social network = <span className="font-latin">social</span>, any other website = <span className="font-latin">referral</span> → ④ nothing at all = <span className="font-latin">(direct) / (none)</span>. Moving between pages of our own site is never a source.
          </li>
          <li>
            <b className="text-body">Attribution (Settings menu):</b> &quot;This visit&quot; (default) uses how that very visit arrived, so Direct means visits that arrived directly. &quot;Last touch&quot; gives a returning visitor the last real source they came from, and &quot;First touch&quot; the source that first brought them. Visits recorded before 16 Oct 2026 only have last-touch data.
          </li>
          <li>
            <b className="text-body">(not set):</b> no source was recorded. This is older data from before source tracking, or a visit where the cookie banner was not yet accepted and the visitor then reloaded the page. It shrinks as new data comes in.
          </li>
          <li>
            <b className="text-body">Ad platforms:</b> add UTM tags to every ad link so each platform and campaign shows by name; use the same spelling every time.{" "}
            <b className="text-body">Google Ads</b> is recognised even without tags while auto-tagging is on (the default), but shows no campaign name; add the tracking template <span className="font-latin">{"{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}"}</span> in the account settings.{" "}
            <b className="text-body">Meta (Facebook / Instagram)</b> puts an <span className="font-latin">fbclid</span> on every link, organic or paid, so it cannot tell an ad from a post: without tags it counts as <span className="font-latin">facebook / social</span>. In the ad&apos;s URL parameters use <span className="font-latin">{"utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}"}</span>.{" "}
            <b className="text-body">Yahoo</b> search ads run through Microsoft Advertising (auto-tagging adds <span className="font-latin">msclkid</span>, shown as <span className="font-latin">yahoo / cpc</span> or <span className="font-latin">bing / cpc</span> depending on where the click came from); Yahoo Ads and Yahoo DSP add <span className="font-latin">yclid</span> or use your UTM tags. TikTok (<span className="font-latin">ttclid</span>), X (<span className="font-latin">twclid</span>) and Snapchat (<span className="font-latin">ScCid</span>) are recognised the same way. Any medium of <span className="font-latin">cpc, ppc, paid, paid_social, paid-social, display, cpm</span> counts as the Paid channel.
          </li>
          <li>
            <b className="text-body">Visit length:</b> the time between the first and last action. Time spent on the last page is not visible, so the typical (median) length is shown rather than the average.
          </li>
          <li>
            <b className="text-body">Low-sample rates:</b> a percentage based on fewer than {d.lowSample} visits is shown dimmed with a &quot;~&quot;, meaning it is only approximate.
          </li>
          <li>
            <b className="text-body">Your own team&apos;s traffic:</b> open any page of the site once with <span className="font-latin">?internal=1</span> to stop that browser being tracked (<span className="font-latin">?internal=0</span> turns it back on).
          </li>
        </ul>
      </details>
    </div>
  );
}
