import Link from "next/link";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { writeMode } from "@/lib/dynamics/write";
import { linkedLeads, possibleDuplicates, searchLeads, type LeadSummary } from "@/lib/crm/lead-links";
import { LeadLinkButtons } from "@/components/crm/customer/CrmEditForms";
import { Badge } from "@/components/shared/Badge";

/**
 * «سرنخ‌های مرتبط» on an old-CRM lead page: leads already linked to this one, other leads with the same phone /
 * e-mail (possible duplicates), and a search to link any other lead (lib/crm/lead-links.ts).
 */
const faDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("fa-IR", { calendar: "gregory" }) : null);

function Row({ lead, children }: { lead: LeadSummary; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link href={`/ops/leads/${lead.id}`} className="text-sm font-medium text-purple-900 hover:text-purple-600 hover:underline">
          {lead.name}
        </Link>
        <p className="mt-0.5 text-xs text-secondary">
          {[lead.code && `کد ${lead.code}`, lead.status, faDate(lead.createdOn), lead.owner].filter(Boolean).join(" · ")}
          {lead.phone && (
            <>
              <span className="mx-1">·</span>
              <span className="font-latin" dir="ltr">
                {lead.phone}
              </span>
            </>
          )}
        </p>
      </div>
      {children}
    </li>
  );
}

export async function LeadLinks({ id, data, query, returnPath }: { id: string; data: Record<string, unknown>; query?: string; returnPath: string }) {
  const session = await auth();
  const canWrite = writeMode() !== "off" && !!session?.user?.id && canAccessPipeline(session.user.role);
  const dry = writeMode() === "dry";
  const [linked, similar, found] = await Promise.all([linkedLeads(id), possibleDuplicates(id, data), query ? searchLeads(query, id) : Promise.resolve([])]);
  const linkedIds = new Set(linked.map((l) => l.id));
  const candidates = similar.filter((l) => !linkedIds.has(l.id));
  const results = found.filter((l) => !linkedIds.has(l.id));

  return (
    <section aria-labelledby="lead-links" className="mt-6 rounded-2xl border border-border bg-white p-6">
      <h2 id="lead-links" className="text-sm font-bold text-purple-900">
        سرنخ‌های مرتبط
      </h2>

      {linked.length > 0 && (
        <ul className="mt-2 divide-y divide-border">
          {linked.map((l) => (
            <Row key={l.id} lead={l}>
              <Badge tone={l.role === "main" ? "purple" : "neutral"}>{l.role === "main" ? "سرنخ اصلی" : "تکراریِ این سرنخ"}</Badge>
            </Row>
          ))}
        </ul>
      )}

      {candidates.length > 0 && (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning-bg/50 p-4">
          <p className="text-sm font-medium text-warning">احتمالاً تکراری — همین شماره یا ایمیل در سرنخ‌های دیگر هم هست:</p>
          <ul className="mt-1 divide-y divide-border">
            {candidates.map((l) => (
              <Row key={l.id} lead={l}>
                {canWrite && <LeadLinkButtons currentId={id} otherId={l.id} returnPath={returnPath} dry={dry} />}
              </Row>
            ))}
          </ul>
        </div>
      )}

      {canWrite && (
        <div className="mt-4">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="min-w-56 flex-1">
              <span className="text-xs font-medium text-secondary">اتصال به سرنخ دیگر — جستجو با نام، موبایل، ایمیل یا کد سرنخ</span>
              <input
                name="linkq"
                defaultValue={query ?? ""}
                className="mt-1 w-full rounded-lg border border-border-strong bg-white px-2.5 py-1.5 text-sm text-body outline-none focus:border-purple-600"
              />
            </label>
            <button type="submit" className="press rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-purple-900 hover:border-purple-600">
              جستجو
            </button>
          </form>
          {query && (
            <ul className="mt-2 divide-y divide-border">
              {results.length === 0 && <li className="py-3 text-sm text-secondary">سرنخی پیدا نشد.</li>}
              {results.map((l) => (
                <Row key={l.id} lead={l}>
                  <LeadLinkButtons currentId={id} otherId={l.id} returnPath={returnPath} dry={dry} />
                </Row>
              ))}
            </ul>
          )}
        </div>
      )}

      {!linked.length && !candidates.length && !canWrite && <p className="mt-2 text-sm text-secondary">سرنخ مرتبطی نیست.</p>}
    </section>
  );
}
