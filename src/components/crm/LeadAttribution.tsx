import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { channelOf } from "@/lib/traffic-channel";

/**
 * Where a lead came from — shown in the leads table (one compact cell) and on
 * the lead page (the full breakdown). Values are the same source / medium /
 * campaign / term / content the analytics dashboard uses, and the channel comes
 * from the same definition (lib/traffic-channel.ts), so a lead and the
 * dashboard can never disagree.
 *
 * Three touches are stored per lead:
 *  - this visit — how the visit in which the form was submitted arrived
 *    (leads created before 16 Oct 2026 have no such value and fall back to the last touch);
 *  - first touch — the very first source this browser was ever seen with;
 *  - last touch — the last REAL source (a later direct visit never replaces it).
 */
export interface LeadAttributionFields {
  utmVisitSource: string | null;
  utmVisitMedium: string | null;
  utmVisitCampaign: string | null;
  utmVisitTerm: string | null;
  utmVisitContent: string | null;
  utmFirstSource: string | null;
  utmFirstMedium: string | null;
  utmFirstCampaign: string | null;
  utmFirstTerm: string | null;
  utmFirstContent: string | null;
  utmLastSource: string | null;
  utmLastMedium: string | null;
  utmLastCampaign: string | null;
  utmLastTerm: string | null;
  utmLastContent: string | null;
}

interface Touch {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
}

const hasAny = (t: Touch) => !!(t.source || t.medium || t.campaign || t.term || t.content);

function touches(l: LeadAttributionFields): { visit: Touch; first: Touch; last: Touch; visitIsFallback: boolean } {
  const first: Touch = { source: l.utmFirstSource, medium: l.utmFirstMedium, campaign: l.utmFirstCampaign, term: l.utmFirstTerm, content: l.utmFirstContent };
  const last: Touch = { source: l.utmLastSource, medium: l.utmLastMedium, campaign: l.utmLastCampaign, term: l.utmLastTerm, content: l.utmLastContent };
  const visit: Touch = { source: l.utmVisitSource, medium: l.utmVisitMedium, campaign: l.utmVisitCampaign, term: l.utmVisitTerm, content: l.utmVisitContent };
  const visitIsFallback = !hasAny(visit) && hasAny(last);
  return { visit: visitIsFallback ? last : visit, first, last, visitIsFallback };
}

const CHANNEL_TONE: Record<string, BadgeTone> = {
  Paid: "warning",
  "Organic Search": "success",
  Social: "purple",
  Email: "purple",
  Referral: "neutral",
  Direct: "neutral",
  Other: "neutral",
  "(not set)": "neutral",
};

function ChannelBadge({ medium }: { medium: string | null }) {
  const channel = channelOf(medium);
  return <Badge tone={CHANNEL_TONE[channel] ?? "neutral"}>{channel}</Badge>;
}

const dash = (v: string | null) => v || "—";

/** Table cell: "google / cpc" with the channel and campaign under it. */
export function LeadSourceCell({ lead }: { lead: LeadAttributionFields }) {
  const { visit } = touches(lead);
  if (!hasAny(visit)) return <span className="text-xs text-secondary">ثبت نشده</span>;
  return (
    <div dir="ltr" className="font-latin text-start text-xs">
      <div className="font-medium text-purple-900">
        {dash(visit.source)} / {dash(visit.medium)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <ChannelBadge medium={visit.medium} />
        {visit.campaign && <span className="max-w-[10rem] truncate text-secondary">{visit.campaign}</span>}
      </div>
    </div>
  );
}

/** Lead page: this visit / first touch / last touch, each with all five fields. */
export function LeadAttributionPanel({ lead }: { lead: LeadAttributionFields }) {
  const { visit, first, last, visitIsFallback } = touches(lead);
  const rows: { label: string; hint: string; touch: Touch }[] = [
    { label: "این بازدید", hint: visitIsFallback ? "(برای این لید فقط آخرین منبع ثبت شده است)" : "بازدیدی که فرم در آن ارسال شد", touch: visit },
    { label: "اولین منبع", hint: "اولین باری که این مرورگر دیده شد", touch: first },
    { label: "آخرین منبع واقعی", hint: "ورود مستقیم بعدی آن را عوض نمی‌کند", touch: last },
  ];
  const any = rows.some((r) => hasAny(r.touch));

  return (
    <div className="mt-5 border-t border-border pt-5">
      <h2 className="text-sm font-bold text-purple-900">منبع ترافیک (Source / Medium)</h2>
      {!any ? (
        <p className="mt-2 text-xs leading-relaxed text-secondary">
          منبعی برای این لید ثبت نشده است. معمولاً یعنی بازدیدکننده کوکی را نپذیرفته بود یا فرم قبل از فعال‌شدن ردیابی منبع ثبت شده است.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto" dir="ltr">
          <table className="w-full min-w-[34rem] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-secondary">
                <th className="py-2 pe-3 text-left font-medium" />
                <th className="px-3 py-2 text-left font-medium">Channel</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
                <th className="px-3 py-2 text-left font-medium">Medium</th>
                <th className="px-3 py-2 text-left font-medium">Campaign</th>
                <th className="px-3 py-2 text-left font-medium">Term</th>
                <th className="px-3 py-2 text-left font-medium">Content</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0 align-top">
                  <td className="py-2.5 pe-3" dir="rtl">
                    <div className="font-medium text-purple-900">{r.label}</div>
                    <div className="mt-0.5 max-w-[11rem] text-[11px] leading-snug text-secondary">{r.hint}</div>
                  </td>
                  {hasAny(r.touch) ? (
                    <>
                      <td className="px-3 py-2.5">
                        <ChannelBadge medium={r.touch.medium} />
                      </td>
                      <td className="font-latin px-3 py-2.5 text-body">{dash(r.touch.source)}</td>
                      <td className="font-latin px-3 py-2.5 text-body">{dash(r.touch.medium)}</td>
                      <td className="font-latin px-3 py-2.5 text-body">{dash(r.touch.campaign)}</td>
                      <td className="font-latin px-3 py-2.5 text-body">{dash(r.touch.term)}</td>
                      <td className="font-latin px-3 py-2.5 text-body">{dash(r.touch.content)}</td>
                    </>
                  ) : (
                    <td colSpan={6} className="px-3 py-2.5 text-secondary" dir="rtl">
                      ثبت نشده
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
