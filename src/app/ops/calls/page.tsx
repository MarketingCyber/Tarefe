import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { FilterChip } from "@/components/crm/customer/OldCrmParts";
import { CallResultForm } from "@/components/crm/customer/CrmEditForms";
import { Badge } from "@/components/shared/Badge";
import { CALL_RESULTS, writeMode } from "@/lib/dynamics/write";
import { callList, leadQueue, recordHref, SPEED_LIMIT_HOURS } from "@/lib/crm/lead-work";

import { getOpsI18n } from "@/lib/ops-i18n/server";
/**
 * «لیست تماس امروز»: an operator's calls for today in one queue — planned calls due today or overdue (old-CRM phone
 * calls), then their new leads not called yet. Each call is finished with one «نتیجه تماس» click, which completes it
 * in the old CRM and plans the next one where needed.
 */
export const dynamic = "force-dynamic";

const ENTITY_FA: Record<string, string> = { lead: "سرنخ", contact: "مشتری", opportunity: "قرارداد", incident: "تیکت" };

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const { t, intl, tn } = await getOpsI18n();
  const time = (d: Date | null) => (d ? d.toLocaleString(intl, { calendar: "gregory", dateStyle: "short", timeStyle: "short" }) : "—");
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/calls");
  if (!canAccessPipeline(session.user.role)) redirect("/ops");
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { crmUserId: true } });
  const myCrm = me?.crmUserId?.toLowerCase() ?? null;
  const all = (await searchParams).who === "all" || !myCrm;

  const [calls, queue] = await Promise.all([callList(all ? null : myCrm), leadQueue(all ? null : myCrm)]);
  const newLeads = queue.filter((l) => l.group === "new");
  const writes = writeMode();
  const results = (entity: string) => (entity === "lead" ? CALL_RESULTS : CALL_RESULTS.filter(([r]) => r !== "wrong_number"));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">{t("لیست تماس امروز")}</h1>
      <p className="mt-1 max-w-[75ch] text-sm leading-relaxed text-secondary">
        {t("تماس‌های برنامه‌ریزی‌شده‌ی امروز و عقب‌افتاده، بعد سرنخ‌های جدیدی که هنوز تماسی نگرفته‌اند. بعد از هر تماس، نتیجه را با یک کلیک ثبت کنید؛ تماس در CRM قدیم")}
        {t("بسته می‌شود و اگر لازم باشد تماس بعدی ساخته می‌شود.")}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {myCrm ? (
          <>
            <FilterChip href="/ops/calls" active={!all}>
              {t("تماس‌های من")}
            </FilterChip>
            <FilterChip href="/ops/calls?who=all" active={all}>
              {t("همه")}
            </FilterChip>
          </>
        ) : (
          <Link href="/ops/my-work" className="text-xs text-secondary hover:text-purple-600">
            {t("برای دیدن فقط تماس‌های خودتان، در «کارهای من» کاربر CRM قدیم خود را انتخاب کنید. فعلاً همه نمایش داده می‌شود.")}
          </Link>
        )}
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-purple-900">{t("تماس‌های برنامه‌ریزی‌شده ({n})", { n: calls.length.toLocaleString(intl) })}</h2>
        {calls.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-white p-4 text-sm text-secondary">{t("برای امروز تماسی برنامه‌ریزی نشده.")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {calls.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.regarding ? (
                        <Link href={recordHref(c.regarding.entity, c.regarding.id)} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                          {c.regarding.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-purple-900">—</span>
                      )}
                      {c.regarding && <span className="text-xs text-secondary">{t(ENTITY_FA[c.regarding.entity] ?? c.regarding.entity)}</span>}
                      {c.overdue && <Badge tone="danger">{t("عقب‌افتاده")}</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-secondary">
                      {c.subject} · {time(c.dueAt)}
                      {all && c.owner ? ` · ${c.owner}` : ""}
                    </p>
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="press font-latin rounded-full border border-border-strong px-3 py-1.5 text-sm font-semibold text-purple-900 hover:border-purple-600">
                      {c.phone}
                    </a>
                  )}
                </div>
                {writes !== "off" && c.regarding && ["lead", "contact", "opportunity", "incident"].includes(c.regarding.entity) && (
                  <div className="mt-3 border-t border-border pt-3">
                    <CallResultForm entity={c.regarding.entity} id={c.regarding.id} callId={c.id} returnPath="/ops/calls" dry={writes === "dry"} results={results(c.regarding.entity)} compact />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-purple-900">{t("سرنخ‌های جدید بدون تماس ({n})", { n: newLeads.length.toLocaleString(intl) })}</h2>
        {newLeads.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-white p-4 text-sm text-secondary">{t("سرنخ جدیدی منتظر تماس نیست.")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {newLeads.slice(0, 50).map((l) => (
              <li key={l.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/ops/leads/${l.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {t(l.name)}
                    </Link>
                    <p className={`mt-0.5 text-xs ${l.waitingHours >= SPEED_LIMIT_HOURS ? "font-semibold text-danger" : "text-secondary"}`}>
                      {[tn(l.type), tn(l.source)].filter(Boolean).join(" · ")} · {t("منتظر {n} ساعت", { n: Math.floor(l.waitingHours).toLocaleString(intl) })} · {t("امتیاز {n}٪", { n: l.score.score.toLocaleString(intl) })}
                    </p>
                  </div>
                  {l.phone && (
                    <a href={`tel:${l.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="press font-latin rounded-full border border-border-strong px-3 py-1.5 text-sm font-semibold text-purple-900 hover:border-purple-600">
                      {l.phone}
                    </a>
                  )}
                </div>
                {writes !== "off" && (
                  <div className="mt-3 border-t border-border pt-3">
                    <CallResultForm entity="lead" id={l.id} returnPath="/ops/calls" dry={writes === "dry"} results={CALL_RESULTS} compact />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
