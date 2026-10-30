import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { CalendarBlank, EnvelopeSimple, ListChecks, NotePencil, Paperclip, Phone } from "@phosphor-icons/react/dist/ssr";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import type { CrmRow } from "@/lib/crm/customer360";

/**
 * Pieces of the Customer 360 that show old-CRM (Dynamics mirror) records: contract and ticket cards and the merged
 * history of tasks, e-mails, calls, appointments and notes. Read-only until write-back to Dynamics exists — every
 * item links to the full record (/ops/old-crm/…), laid out like its Dynamics form.
 */

const F = "@OData.Community.Display.V1.FormattedValue";
type Data = Record<string, unknown>;

/** A field as Dynamics displays it (lookups by their name), trimmed; null when empty. */
export function shown(data: Data, field: string): string | null {
  const lookup = `_${field}_value`;
  const v = data[lookup + F] ?? data[field + F] ?? (lookup in data ? null : data[field]);
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

// Dynamics' built-in status texts are English; the custom ones (مرحله، وضعیت) are already Persian.
const STANDARD_FA: Record<string, string> = {
  Open: "باز", Completed: "انجام‌شده", Canceled: "لغوشده", Cancelled: "لغوشده", Scheduled: "زمان‌بندی‌شده",
  Active: "فعال", Resolved: "حل‌شده", Won: "موفق", Lost: "ناموفق", "In Progress": "در جریان", "On Hold": "متوقف",
  "Out-Sold": "از دست رفته", Made: "انجام‌شده", Received: "دریافت‌شده", Sent: "ارسال‌شده", Draft: "پیش‌نویس",
  Incoming: "ورودی", Outgoing: "خروجی",
};
/** A status as Persian operators read it. */
export const statusFa = (text: string | null) => (text ? (STANDARD_FA[text] ?? text) : null);

/** Dates as the rest of /ops shows them (Gregorian, Persian digits); date-only fields without a time. */
export function shownDate(data: Data, field: string, withTime = false): string | null {
  const raw = data[field];
  if (typeof raw !== "string" || !raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return withTime
    ? d.toLocaleString("fa-IR", { calendar: "gregory", dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" })
    : d.toLocaleDateString("fa-IR", { calendar: "gregory", timeZone: "Europe/Berlin" });
}

const recordHref = (r: CrmRow) => `/ops/old-crm/${r.entity}/${r.crmId}`;

// Dynamics statecode: opportunity 0 open / 1 won / 2 lost; incident 0 active / 1 resolved / 2 cancelled.
const STATE_TONE: Record<string, BadgeTone[]> = { opportunity: ["purple", "success", "neutral"], incident: ["warning", "success", "neutral"] };
const stateTone = (r: CrmRow): BadgeTone => STATE_TONE[r.entity]?.[Number(r.data.statecode)] ?? "neutral";

function Meta({ items }: { items: [string, string | null][] }) {
  const filled = items.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
      {filled.map(([label, value]) => (
        <div key={label} className="flex gap-1">
          <dt>{label}:</dt>
          <dd className="text-body">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContractCard({ r }: { r: CrmRow }) {
  const d = r.data;
  const amount = typeof d.new_mablaq === "number" && d.new_mablaq > 0 ? `${d.new_mablaq.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : null;
  return (
    <Link href={`/ops/contracts/${r.crmId}`} className="block rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-purple-900">{shown(d, "name") ?? "قرارداد بدون عنوان"}</p>
          <p className="text-xs text-secondary">{[shown(d, "new_category"), shown(d, "parentaccountid"), shown(d, "new_contract_company")].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {shown(d, "new_step") && <Badge tone={stateTone(r)}>{shown(d, "new_step")}</Badge>}
          {shown(d, "statuscode") && <Badge>{statusFa(shown(d, "statuscode"))}</Badge>}
        </div>
      </div>
      <Meta
        items={[
          ["شروع", shownDate(d, "new_startdate")],
          ["پایان", shownDate(d, "new_dateend")],
          ["مهلت لغو", shownDate(d, "new_datelaqve")],
          ["لغو شد", shownDate(d, "new_cancellation_date")],
          ["مدت", shown(d, "new_modat")],
          ["مبلغ", amount && [amount, shown(d, "new_mah")].filter(Boolean).join(" / ")],
          ["Vertragsnummer", shown(d, "new_shomareh")],
          ["کد", shown(d, "new_code")],
          ["مسئول", shown(d, "ownerid")],
        ]}
      />
    </Link>
  );
}

export function TicketCard({ r }: { r: CrmRow }) {
  const d = r.data;
  return (
    <Link href={recordHref(r)} className="block rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-purple-900">{shown(d, "title") ?? "تیکت بدون عنوان"}</p>
          <p className="text-xs text-secondary">{[shown(d, "new_category"), shown(d, "new_opportunity")].filter(Boolean).join(" · ")}</p>
        </div>
        <Badge tone={stateTone(r)}>{shown(d, "new_status") ?? statusFa(shown(d, "statuscode")) ?? "—"}</Badge>
      </div>
      <Meta
        items={[
          ["شماره", shown(d, "ticketnumber")],
          ["ایجاد", shownDate(d, "createdon")],
          ["مسئول", shown(d, "ownerid")],
        ]}
      />
    </Link>
  );
}

export const HISTORY_TYPES: Record<string, { label: string; icon: Icon }> = {
  email: { label: "ایمیل", icon: EnvelopeSimple },
  phonecall: { label: "تماس", icon: Phone },
  task: { label: "تسک", icon: ListChecks },
  appointment: { label: "قرار", icon: CalendarBlank },
  annotation: { label: "یادداشت", icon: NotePencil },
};

/** When an activity happened: completed → its end, else created. */
export const happenedAt = (r: CrmRow) => {
  const v = (r.data.actualend ?? r.data.createdon) as string | undefined;
  return v ? new Date(v).getTime() : 0;
};

const plain = (html: unknown) =>
  typeof html === "string"
    ? html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
    : "";

export function HistoryItem({ r, customerId }: { r: CrmRow; customerId: string }) {
  const d = r.data;
  const type = HISTORY_TYPES[r.entity];
  const Icon = type?.icon ?? NotePencil;
  const isNote = r.entity === "annotation";
  const title = shown(d, "subject") ?? (isNote ? shown(d, "filename") : null) ?? type?.label ?? r.entity;
  const body = plain(isNote ? d.notetext : d.description);
  // "About" only when the activity is filed on something other than the person (e.g. a contract or a ticket).
  const aboutId = (d._regardingobjectid_value ?? d._objectid_value) as string | undefined;
  const about = aboutId && aboutId.toLowerCase() !== customerId.toLowerCase() ? (shown(d, "regardingobjectid") ?? shown(d, "objectid")) : null;
  const when = shownDate(d, typeof d.actualend === "string" ? "actualend" : "createdon", true);
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-white text-purple-600">
        <Icon size={14} weight="bold" />
      </span>
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-secondary">
          <span className="font-medium text-purple-900">{type?.label}</span>
          {shown(d, "directioncode") && <span>{statusFa(shown(d, "directioncode"))}</span>}
          {r.entity === "task" && shown(d, "statecode") && <span>{statusFa(shown(d, "statecode"))}</span>}
          <span>{when}</span>
          {(shown(d, "ownerid") ?? shown(d, "createdby")) && <span>· {shown(d, "ownerid") ?? shown(d, "createdby")}</span>}
        </div>
        <Link href={recordHref(r)} className="mt-0.5 block text-sm font-medium text-body hover:text-purple-600 hover:underline">
          {title}
        </Link>
        {about && <p className="text-xs text-secondary">درباره: {about}</p>}
        {body && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-secondary">{body}</p>}
        {isNote && d.isdocument === true && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-secondary">
            <Paperclip size={12} /> <span className="font-latin">{String(d.filename ?? "")}</span>
          </p>
        )}
      </div>
    </li>
  );
}

/** A filter link styled as a chip (history type, contract view …). */
export function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-purple-600 bg-purple-600 text-white" : "border-border-strong text-purple-900 hover:border-purple-600"}`}
    >
      {children}
    </Link>
  );
}
