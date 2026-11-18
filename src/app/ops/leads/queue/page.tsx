import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessMarketing, canAccessPipeline } from "@/lib/permissions";
import { FilterChip } from "@/components/crm/customer/OldCrmParts";
import { BulkLeads, type BulkRow } from "@/components/crm/BulkLeads";
import { LEAD_CLOSE_REASONS, LEAD_OPEN_REASONS, LEAD_STAGES, assignableUsers, writeMode } from "@/lib/dynamics/write";
import { SPEED_LIMIT_HOURS, leadQueue } from "@/lib/crm/lead-work";
import { TIER_FA, reasonText, reasonsFor } from "@/lib/crm/lead-score";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import type { T } from "@/lib/ops-i18n/core";
/**
 * «صف سرنخ‌ها»: the open old-CRM leads to work on — never contacted first (longest waiting at the top; red after
 * SPEED_LIMIT_HOURS), then not answered yet, then in follow-up (best score first). Select several for bulk actions.
 */
export const dynamic = "force-dynamic";

const GROUP_FA = { new: "جدید، بدون تماس", no_answer: "جواب نداده", follow_up: "در حال پیگیری" };

function waitingText(hours: number, t: T, intl: string) {
  if (hours < 1) return t("{n} دقیقه", { n: Math.max(1, Math.round(hours * 60)).toLocaleString(intl) });
  if (hours < 48) return t("{n} ساعت", { n: Math.floor(hours).toLocaleString(intl) });
  return t("{n} روز", { n: Math.floor(hours / 24).toLocaleString(intl) });
}

export default async function LeadQueuePage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  const { t, intl, tn } = await getOpsI18n();
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/leads/queue");
  if (!canAccessPipeline(session.user.role)) redirect("/ops");
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { crmUserId: true } });
  const myCrm = me?.crmUserId?.toLowerCase() ?? null;
  const mine = (await searchParams).who === "me" && !!myCrm;

  const [queue, users] = await Promise.all([leadQueue(mine ? myCrm : null), assignableUsers()]);
  const late = queue.filter((l) => l.group === "new" && l.waitingHours >= SPEED_LIMIT_HOURS);
  const count = (g: string) => queue.filter((l) => l.group === g).length;
  const rows: BulkRow[] = queue.map((l) => ({
    id: l.id,
    name: l.name === "بدون نام" ? t(l.name) : l.name,
    phone: l.phone,
    meta: [t(GROUP_FA[l.group]), tn(l.type), tn(l.source)].filter(Boolean).join(" · "),
    stage: l.stage,
    owner: l.owner,
    waiting: l.group === "new" ? waitingText(l.waitingHours, t, intl) : l.attempts ? t("{n} تماس بی‌پاسخ", { n: l.attempts.toLocaleString(intl) }) : null,
    late: l.group === "new" && l.waitingHours >= SPEED_LIMIT_HOURS,
    score: l.score.score,
    tier: TIER_FA[l.score.tier],
    tierTone: l.score.tier,
    scoreReasons: reasonsFor(l.score.reasons, canAccessMarketing(session?.user?.role)).map((r) => reasonText(r, t, intl)).join("\n"),
  }));

  return (
    <div className="container-page py-8">
      <Link href="/ops/leads" className="text-sm font-medium text-secondary hover:text-purple-600">
        {t("← لیدها")}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-purple-900">{t("صف سرنخ‌ها")}</h1>
      <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-secondary">
        {t("سرنخ‌های باز CRM قدیم به ترتیب کار: اول سرنخ‌های جدیدی که هنوز تماسی نگرفته‌اند (قدیمی‌ترین بالا؛ بعد از {n} ساعت قرمز می‌شوند و به مسئولش هشدار می‌رود)، بعد جواب‌نداده‌ها و در حال پیگیری‌ها به ترتیب امتیاز. امتیاز = احتمال تبدیل به قرارداد، از سابقه‌ی همین منبع و نوع قرارداد در یک سال گذشته (نگه‌داشتن ماوس روی امتیاز دلیل‌هایش را نشان می‌دهد).", { n: SPEED_LIMIT_HOURS.toLocaleString(intl) })}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <FilterChip href="/ops/leads/queue" active={!mine}>
          {t("همه")}
        </FilterChip>
        {myCrm ? (
          <FilterChip href="/ops/leads/queue?who=me" active={mine}>
            {t("فقط سرنخ‌های من")}
          </FilterChip>
        ) : (
          <Link href="/ops/my-work" className="text-xs text-secondary hover:text-purple-600">
            {t("(برای «سرنخ‌های من» در «کارهای من» کاربر CRM قدیم خود را انتخاب کنید)")}
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("جدید، بدون تماس"), count("new"), ""],
          [t("دیرتر از {n} ساعت", { n: SPEED_LIMIT_HOURS.toLocaleString(intl) }), late.length, late.length ? "text-danger" : ""],
          [t("جواب نداده"), count("no_answer"), ""],
          [t("در حال پیگیری"), count("follow_up"), ""],
        ].map(([label, n, tone]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs text-secondary">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${tone || "text-purple-900"}`}>{Number(n).toLocaleString(intl)}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-white p-4 text-sm text-secondary">{t("سرنخ بازی نیست.")}</p>
      ) : (
        <BulkLeads
          rows={rows}
          users={users}
          stages={LEAD_STAGES}
          reasons={LEAD_OPEN_REASONS}
          closeReasons={LEAD_CLOSE_REASONS}
          returnPath="/ops/leads/queue"
          canWrite={writeMode() !== "off"}
          dry={writeMode() === "dry"}
        />
      )}
    </div>
  );
}
