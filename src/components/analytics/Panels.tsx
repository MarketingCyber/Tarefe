import { Lightbulb } from "@phosphor-icons/react/dist/ssr";
import { formatValue } from "@/lib/analytics-format";
import { filtersToQuery, type BreakdownRow, type Dim } from "@/lib/analytics-report";
import type { Dashboard } from "@/lib/analytics-dashboard";
import type { ConsentShare, LandingFunnelRow, SiteFunnel } from "@/lib/landing-report";
import { NavLink } from "./DashboardShell";
import { Hint, Sparkline } from "./StatTiles";
import { DIM_LABEL, dimValueLabel, eventLabel, CHANNEL_HINT } from "./labels";

/**
 * The question cards. Each answers ONE plain question, leads with the answer
 * (the bars), and keeps the detail secondary. Rules from the BI guidance:
 *  - horizontal bars for a ranked list, thin (8px) with a 4px-rounded data end
 *    and a square baseline; ONE colour (brand purple) because the categories
 *    are not a value scale — emphasis, not a rainbow;
 *  - the number sits at the end of its row, so no value ever depends on hover;
 *  - rates computed from few visits are shown muted with "~" instead of
 *    pretending to be precise.
 */
const CARD = "rounded-2xl border border-border bg-white p-5";

export function Insights({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="flex gap-3 rounded-2xl bg-purple-600/[0.06] px-5 py-4">
      <Lightbulb size={20} weight="duotone" className="mt-0.5 shrink-0 text-purple-600" />
      <ul className="space-y-1 text-sm leading-relaxed text-purple-900">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

interface Tab {
  label: string;
  href: string;
  active: boolean;
}

function Tabs({ tabs, label }: { tabs: Tab[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mt-3 flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <NavLink
          key={t.label}
          href={t.href}
          role="tab"
          active={t.active}
          className={`press inline-flex min-h-8 items-center rounded-full px-3.5 text-xs font-medium transition-colors ${t.active ? "bg-purple-600 text-white" : "bg-tint text-body hover:bg-purple-600/10 hover:text-purple-900"}`}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}

function Bar({ share, muted }: { share: number; muted?: boolean }) {
  // min width so a tiny-but-real value still reads as a bar; 4px rounded data end, square baseline.
  return (
    <div className="h-2 w-full overflow-hidden rounded-e-[4px] bg-tint">
      <div className={`h-full rounded-e-[4px] ${muted ? "bg-purple-600/40" : "bg-purple-600"}`} style={{ width: `${Math.max(1.5, share * 100)}%` }} />
    </div>
  );
}

interface Col {
  key: string;
  label: string;
  hint?: string;
}

function BarRows({ rows, cols, dim, lowSample }: { rows: BreakdownRow[]; cols: Col[]; dim: Dim; lowSample: number }) {
  const max = Math.max(...rows.map((r) => r.values.sessions ?? 0), 1);
  const total = rows.reduce((a, x) => a + (x.values.sessions ?? 0), 0);
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-secondary" aria-hidden>
        {cols.map((c) => (
          <span key={c.key} className="w-11 text-end sm:w-14">
            {c.label}
          </span>
        ))}
      </div>
      <ul className="space-y-3">
        {rows.map((r) => {
          const sessions = r.values.sessions ?? 0;
          const few = sessions > 0 && sessions < lowSample;
          const label = dim === "landing_group" || dim === "landing" ? r.keys[0] : dimValueLabel(dim, r.keys[0]);
          return (
            <li key={r.keys.join("|")} title={`${label}: ${sessions} ${sessions === 1 ? "visit" : "visits"}${dim === "channel" && CHANNEL_HINT[r.keys[0]] ? ` — ${CHANNEL_HINT[r.keys[0]]}` : ""}`}>
              {/* phones: the name gets its own full-width line (long paths), numbers sit under it, aligned with the column headers */}
              <div className="mb-1 flex flex-col gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="min-w-0 break-all text-body sm:truncate">
                  <bdi className={dim === "landing_group" || dim === "landing" ? "font-latin" : ""}>{label}</bdi>
                </span>
                <span className="flex shrink-0 items-baseline gap-2 max-sm:self-end">
                  {cols.map((c) => {
                    let text = "—";
                    let muted = false;
                    if (c.key === "sessions") text = formatValue("int", sessions);
                    else if (c.key === "share") text = formatValue("percent", total ? sessions / total : 0);
                    else if (c.key === "leads") text = r.leads === null ? "—" : formatValue("int", r.leads);
                    else if (c.key === "submissions") text = formatValue("int", r.values.submissions ?? 0);
                    else if (c.key === "conv_rate") {
                      text = sessions === 0 ? "—" : `${few ? "~" : ""}${formatValue("percent", r.values.conv_rate ?? 0)}`;
                      muted = few;
                    }
                    return (
                      <span key={c.key} dir="ltr" className={`font-latin w-11 text-end sm:w-14 ${c.key === "sessions" || c.key === "share" ? "text-sm font-bold text-purple-900" : `text-xs ${muted ? "text-secondary/70" : "text-secondary"}`}`}>
                        {text}
                      </span>
                    );
                  })}
                </span>
              </div>
              <Bar share={sessions / max} muted={few} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardHead({ title, subtitle, hint }: { title: string; subtitle?: string; hint?: string }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 text-base font-bold text-purple-900">
        {title}
        {hint && <Hint text={hint} />}
      </h3>
      {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-secondary">{subtitle}</p>}
    </div>
  );
}

const tabsFor = (d: Pick<Dashboard, "filters">, param: "src" | "dev", dims: readonly Dim[], current: Dim): Tab[] =>
  dims.map((dim) => ({
    label: DIM_LABEL[dim],
    active: current === dim,
    href: `?${filtersToQuery(d.filters, { [param]: (param === "src" ? dim === "channel" : dim === "device") ? undefined : dim })}`,
  }));

export function SourcesCard({ d, dims }: { d: Dashboard; dims: readonly Dim[] }) {
  const f = d.filters;
  const rows = d.sources.filter((r) => (r.values.sessions ?? 0) > 0 || (r.leads ?? 0) > 0).slice(0, 8);
  const hasLeads = rows.some((r) => r.leads !== null);
  const cols: Col[] = [{ key: "sessions", label: "Visits" }, ...(hasLeads ? [{ key: "leads", label: "Leads" }] : []), { key: "conv_rate", label: "Conv." }];
  return (
    <section className={CARD}>
      <CardHead title="Where do visitors come from?" subtitle="The channel or site that brought them to your site." hint="Leads come from the CRM and do not depend on cookie consent. Conv. is the share of tracked visits that submitted the form." />
      <Tabs tabs={tabsFor(d, "src", dims, f.srcDim)} label="Source type" />
      {rows.length === 0 ? <p className="py-10 text-center text-sm text-secondary">No data.</p> : <BarRows rows={rows} cols={cols} dim={f.srcDim} lowSample={d.lowSample} />}
      <p className="mt-4 text-[11px] leading-relaxed text-secondary">
        Only visits that accepted cookies are tracked. &quot;{dimValueLabel("channel", "(not set)")}&quot; means no source was recorded (older data, or the visitor accepted cookies after leaving the landing page). Hover a channel for what it includes.
      </p>
    </section>
  );
}

export function LandingCard({ d }: { d: Dashboard }) {
  const rows = d.landing.filter((r) => (r.values.sessions ?? 0) > 0);
  return (
    <section className={CARD}>
      <CardHead title="Which pages do people land on?" subtitle="The first page of each visit (language prefix removed)." hint="A page many people land on that rarely produces a form is the best place to improve." />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary">No data.</p>
      ) : (
        <BarRows
          rows={rows}
          cols={[
            { key: "sessions", label: "Visits" },
            { key: "submissions", label: "Forms" },
            { key: "conv_rate", label: "Conv." },
          ]}
          dim="landing_group"
          lowSample={d.lowSample}
        />
      )}
    </section>
  );
}

export function DevicesCard({ d, dims }: { d: Dashboard; dims: readonly Dim[] }) {
  const f = d.filters;
  const rows = d.devices.filter((r) => (r.values.sessions ?? 0) > 0).slice(0, 8);
  return (
    <section className={CARD}>
      <CardHead title="What do they use?" subtitle="Each group's share of all visits." />
      <Tabs tabs={tabsFor(d, "dev", dims, f.devDim)} label="Breakdown type" />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary">No data.</p>
      ) : (
        <BarRows
          rows={rows}
          cols={[
            { key: "sessions", label: "Visits" },
            { key: "share", label: "Share" },
          ]}
          dim={f.devDim}
          lowSample={0}
        />
      )}
      {rows.length === 1 && rows[0].keys[0] === "(not set)" && <p className="mt-4 text-[11px] leading-relaxed text-secondary">Device and browser have been recorded since 15 Oct 2026; older data shows as (not set).</p>}
    </section>
  );
}

export function EventsCard({ d }: { d: Dashboard }) {
  const rows = d.events.filter((e) => e.name !== "web_vital").slice(0, 9);
  const max = Math.max(...rows.map((r) => r.events), 1);
  return (
    <section className={CARD}>
      <CardHead title="What do people do?" subtitle="How many times each action happened, and how many visits did it." />
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary">No events recorded.</p>
      ) : (
        <div className="mt-4">
        <div className="mb-1 flex items-center justify-end gap-2 text-[11px] text-secondary" aria-hidden>
          <span className="w-11 text-end sm:w-14">Count</span>
          <span className="w-11 text-end sm:w-14">Visits</span>
        </div>
        <ul className="space-y-3">
          {rows.map((e) => (
            <li key={e.name} title={e.name}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-body sm:truncate">{eventLabel(e.name)}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span dir="ltr" className="font-latin w-11 text-end text-sm font-bold text-purple-900 sm:w-14">
                    {formatValue("int", e.events)}
                  </span>
                  <span dir="ltr" className="font-latin w-11 text-end text-xs text-secondary sm:w-14" title="Visits that did this">
                    {formatValue("int", e.sessions)}
                  </span>
                </span>
              </div>
              <Bar share={e.events / max} />
            </li>
          ))}
        </ul>
        </div>
      )}
    </section>
  );
}

const STEP_PLAIN: Record<string, string> = {
  sessions: "Entered the site",
  engaged: "Did something on the site",
  viewed_service: "Viewed a service page",
  used_calc: "Used the electricity/gas calculator",
  clicked_cta: "Clicked a tariff button",
  form_started: "Started the consultation form",
  submitted: "Submitted the consultation form",
};

export function FunnelCard({ d }: { d: Dashboard }) {
  const steps = d.funnel.steps;
  const first = steps[0]?.count ?? 0;
  const newSteps = steps.filter((s) => (s.key === "used_calc" || s.key === "clicked_cta") && s.count === 0);
  return (
    <section className={CARD}>
      <CardHead
        title="How many reach the form?"
        subtitle="The usual path from entering the site to submitting the consultation form."
        hint={d.funnel.mode === "open" ? "Each step is counted on its own: someone can submit the form without ever seeing the calculator. In Settings you can switch to \"In sequence\"." : "Only people who also did every earlier step are counted."}
      />
      {first === 0 ? (
        <p className="py-10 text-center text-sm text-secondary">No visits in this period.</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {steps.map((s, i) => {
            const ofFirst = s.ofFirst;
            const cont = s.ofPrevious !== null && s.ofPrevious <= 1 ? s.ofPrevious : null;
            const isNew = (s.key === "used_calc" || s.key === "clicked_cta") && s.count === 0;
            return (
              <li key={s.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-sm text-body">
                    <span className="font-latin me-2 text-xs text-secondary">{i + 1}</span>
                    {STEP_PLAIN[s.key]}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span dir="ltr" className="font-latin text-base font-bold text-purple-900">
                      {isNew ? "—" : formatValue("int", s.count)}
                    </span>
                    <span dir="ltr" className="font-latin w-14 text-end text-xs text-secondary" title="Of all visits">
                      {isNew ? "" : formatValue("percent", ofFirst)}
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-e-[4px] bg-tint">
                  <div className="h-full rounded-e-[4px] bg-purple-600" style={{ width: `${Math.max(1.5, ofFirst * 100)}%`, opacity: Math.max(0.35, 1 - i * 0.11) }} />
                </div>
                {i > 0 && cont !== null && !isNew && <p className="mt-1 text-[11px] text-secondary">{formatValue("percent", cont)} continued from the previous step</p>}
              </li>
            );
          })}
        </ol>
      )}
      {newSteps.length > 0 && first > 0 && <p className="mt-4 rounded-lg bg-tint px-3 py-2 text-[11px] leading-relaxed text-secondary">Calculator use and tariff clicks are newly tracked; they show as &quot;—&quot; until data builds up.</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-secondary">Only visitors who accepted cookies are counted.</p>
    </section>
  );
}

// ============================================================ all visits (no cookies)

function asRows(rows: { key: string; visits: number }[]): BreakdownRow[] {
  return rows.map((r) => ({ keys: [r.key], values: { sessions: r.visits }, leads: null }));
}

/**
 * Everyone who loaded a page, from the server's own cookie-free counter —
 * including the visitors who never touched the cookie banner and are therefore
 * invisible to everything else on this page. Sits first because it is the only
 * place a Google Ads click is guaranteed to show up.
 */
export function ServerVisitsSection({ d, srcDims, devDims }: { d: Pick<Dashboard, "filters" | "server">; srcDims: readonly Dim[]; devDims: readonly Dim[] }) {
  const s = d.server;
  const f = d.filters;
  const change = s.previousVisits > 0 ? (s.visits - s.previousVisits) / s.previousVisits : null;
  const srcRows = asRows(s.sources);
  const landingRows = asRows(s.landing);
  const devRows = asRows(s.devices);
  const cols: Col[] = [
    { key: "sessions", label: "Visits" },
    { key: "share", label: "Share" },
  ];

  return (
    <section>
      <div className={CARD}>
        <CardHead
          title="All visits (no cookies needed)"
          subtitle="Every page load by a real browser, counted on our server, whether or not the visitor accepted cookies. Bots and prefetches are excluded. Nothing is stored on the visitor's device."
          hint="This counts full page loads from the server's own log. Visitors are told apart only by an anonymous code that changes every day, so a person who returns on another day counts as a new visitor."
        />

        {s.visits === 0 ? (
          <p className="mt-4 rounded-lg bg-tint px-3 py-3 text-sm text-secondary">
            No visits counted in this period yet.
            {s.firstHitAt ? (
              <>
                {" "}
                Counting started on <span className="font-latin">{s.firstHitAt}</span>.
              </>
            ) : (
              " Counting starts with the next visit."
            )}
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-tint p-4">
                <dt className="text-xs text-secondary">Visits</dt>
                <dd className="font-latin mt-1 text-3xl font-bold tracking-tight text-purple-900">{formatValue("int", s.visits)}</dd>
                {change !== null && <dd className={`mt-0.5 text-xs font-semibold ${Math.abs(change) < 0.005 ? "text-secondary" : change > 0 ? "text-success" : "text-danger"}`}>{Math.abs(change) < 0.005 ? "no change" : `${change > 0 ? "+" : "−"}${Math.abs(change * 100).toFixed(0)}%`} vs previous period</dd>}
              </div>
              <div className="rounded-xl bg-tint p-4">
                <dt className="flex items-center gap-1.5 text-xs text-secondary">
                  From ads
                  <Hint text="Visits that arrived with a paid click id (Google Ads gclid / gbraid / wbraid, Bing msclkid) or with a paid medium such as cpc." />
                </dt>
                <dd className="font-latin mt-1 text-3xl font-bold tracking-tight text-purple-900">{formatValue("int", s.paidVisits)}</dd>
                <dd className="mt-0.5 text-xs text-secondary">{formatValue("percent", s.paidVisits / s.visits)} of visits</dd>
              </div>
              <div className="rounded-xl bg-tint p-4">
                <dt className="flex items-center gap-1.5 text-xs text-secondary">
                  Visitors
                  <Hint text="Distinct visitors per day, added up over the period. The anonymous visitor code changes daily, so someone returning on another day is counted again." />
                </dt>
                <dd className="font-latin mt-1 text-3xl font-bold tracking-tight text-purple-900">{formatValue("int", s.visitors)}</dd>
              </div>
            </dl>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-secondary">Visits per day</p>
              <Sparkline values={s.daily.values} height={96} />
              <div dir="ltr" className="font-latin mt-1 flex justify-between text-[10px] text-secondary">
                <span>{s.daily.buckets[0]}</span>
                <span>{s.daily.buckets[s.daily.buckets.length - 1]}</span>
              </div>
            </div>
          </div>
        )}

        {s.ignoredFilters.length > 0 && (
          <p className="mt-3 rounded-lg bg-tint px-3 py-2 text-xs text-secondary">
            This section does not know {s.ignoredFilters.map((x) => (x === "event" ? "the event filter" : DIM_LABEL[x] ?? x)).join(", ")}, so those filters are not applied here.
          </p>
        )}
      </div>

      {s.visits > 0 && (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          <section className={CARD}>
            <CardHead title="Where all visits come from" subtitle="Counted on the server, so ad clicks show up even without cookie consent." />
            <Tabs tabs={tabsFor(d, "src", srcDims, f.srcDim)} label="Source type" />
            <BarRows rows={srcRows} cols={cols} dim={f.srcDim} lowSample={0} />
          </section>
          <section className={CARD}>
            <CardHead title="Where all visits land" subtitle="The first page of each visit (language prefix removed)." />
            <BarRows rows={landingRows} cols={cols} dim="landing_group" lowSample={0} />
            <div className="mt-6">
              <CardHead title={DIM_LABEL[f.devDim] === "Device" ? "Devices" : DIM_LABEL[f.devDim]} />
              <Tabs tabs={tabsFor(d, "dev", devDims, f.devDim)} label="Breakdown type" />
              <BarRows rows={devRows} cols={cols} dim={f.devDim} lowSample={0} />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

const FUNNEL_STEPS: { key: "views" | "usage" | "results" | "tariff" | "submitted"; label: string }[] = [
  { key: "views", label: "Opened the page" },
  { key: "usage", label: "Chose usage + postcode" },
  { key: "results", label: "Saw tariffs" },
  { key: "tariff", label: "Picked a tariff" },
  { key: "submitted", label: "Sent the request" },
];

/** The Google Ads landing journey, step by step (cookie-free counts). */
export function LandingJourneyCard({ rows }: { rows: LandingFunnelRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-bold text-purple-900">Ads landing journey</h2>
      <p className="mt-0.5 max-w-[85ch] text-xs leading-relaxed text-secondary">
        How far people get on the two landing pages (/fa/landing/electricity and /fa/landing/gas). Counted on our server without cookies: each person once per step per day, so it covers everyone, not only visitors who accepted cookies.
      </p>
      <div className="mt-4 grid gap-4">
        {rows.map((r) => {
          const values = { views: r.views, ...r.steps };
          const top = Math.max(values.views, values.usage, 1);
          return (
            <div key={r.kind} className="rounded-2xl border border-border bg-white p-5">
              <p className="text-sm font-bold capitalize text-purple-900">
                {r.kind} <span className="font-normal text-secondary">· {r.fromAds} of the people who started came from an ad</span>
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {FUNNEL_STEPS.map((s, i) => {
                  const v = values[s.key];
                  const prev = i > 0 ? values[FUNNEL_STEPS[i - 1].key] : null;
                  return (
                    <li key={s.key}>
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-body">{s.label}</span>
                        <span className="font-latin font-semibold text-purple-900">
                          {v}
                          {prev ? <span className="ms-2 font-normal text-secondary">{Math.round((v / prev) * 100)}% of previous</span> : null}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                        <div className="h-full rounded-full bg-purple-600" style={{ width: `${Math.min(100, (v / top) * 100)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The funnel for everyone, counted on our server without cookies — so it needs nobody's consent. */
export function SiteFunnelCard({ f }: { f: SiteFunnel }) {
  const steps = [
    { label: "Arrived on the site", value: f.visitors },
    { label: "Viewed a service page", value: f.viewedService },
    { label: "Used the calculator", value: f.usedCalculator },
    { label: "Clicked a tariff button", value: f.clickedTariff },
    { label: "Started the consultation form", value: f.startedForm },
    { label: "Sent a consultation request", value: f.requests },
  ];
  const top = Math.max(f.visitors, 1);
  return (
    <section>
      <h2 className="text-lg font-bold text-purple-900">Funnel for all visitors (no cookies needed)</h2>
      <p className="mt-0.5 max-w-[85ch] text-xs leading-relaxed text-secondary">
        Counted on our server for everyone, whether or not they accepted the cookie banner: each person once per step per day. Each step stands on its own (someone can send a request without using the calculator). The Ads landing pages have their own table below. Action counts started on {f.firstEventAt ?? "—"}; earlier days show 0 for the middle steps (service pages included). &quot;Sent a request&quot; is the real number of leads.
      </p>
      <div className="mt-4 rounded-2xl border border-border bg-white p-5">
        <ul className="flex flex-col gap-3.5">
          {steps.map((s, i) => (
            <li key={s.label}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="text-body">
                  <span className="font-latin me-2 text-secondary">{i + 1}</span>
                  {s.label}
                </span>
                <span className="font-latin font-semibold text-purple-900">
                  {s.value}
                  {i > 0 && f.visitors > 0 ? <span className="ms-2 font-normal text-secondary">{((s.value / f.visitors) * 100).toFixed(1)}% of arrivals</span> : null}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-purple-600" style={{ width: `${Math.min(100, Math.max(s.value > 0 ? 1.5 : 0, (s.value / top) * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-border pt-3 text-xs text-secondary">
          Also: <span className="font-latin font-semibold text-purple-900">{f.pagesPerVisitor ? f.pagesPerVisitor.toFixed(1) : "—"}</span> pages per visitor · <span className="font-latin font-semibold text-purple-900">{f.whatsapp}</span> WhatsApp clicks · <span className="font-latin font-semibold text-purple-900">{f.phone}</span> phone clicks
        </p>
      </div>
    </section>
  );
}

/** How many visitors accepted the cookie banner, against everyone who arrived. */
export function ConsentCard({ c }: { c: ConsentShare }) {
  const share = c.visitors > 0 ? Math.min(1, c.accepted / c.visitors) : null;
  const decided = c.clickedAccept + c.clickedDecline;
  return (
    <section className="mt-6 max-w-2xl rounded-2xl border border-border bg-white p-5">
      <h2 className="text-lg font-bold text-purple-900">Cookie banner</h2>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="font-latin text-4xl font-bold tracking-tight text-purple-900">{share === null ? "—" : formatValue("percent", share)}</span>
        <span className="text-sm text-secondary">of visitors have accepted cookies</span>
      </div>
      <p className="font-latin mt-1 text-xs text-secondary">
        {c.accepted} of {c.visitors} visitors
      </p>
      {decided > 0 && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-secondary">
          Banner clicks since <span className="font-latin">{c.clickCountingSince}</span>: <span className="font-latin font-semibold text-purple-900">{c.clickedAccept}</span> accepted, <span className="font-latin font-semibold text-purple-900">{c.clickedDecline}</span> chose &quot;necessary only&quot;.
        </p>
      )}
    </section>
  );
}
