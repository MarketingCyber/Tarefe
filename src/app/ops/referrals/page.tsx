import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { Badge } from "@/components/shared/Badge";
import { REFERRAL_STATUS_FA, checkReferrals } from "@/lib/referral-check";
import { markVoucherSent, undoVoucherSent } from "@/lib/crm/referral-actions";

/**
 * Referrals and the 10 € voucher (owner's rules, lib/referral-check.ts): who came with whose code, where each one
 * stands, and the vouchers to send. Re-checked when the page opens (and by the old-CRM sync every 15 minutes).
 */
export const dynamic = "force-dynamic";

const TONE: Record<string, "neutral" | "purple" | "success" | "warning" | "danger"> = {
  waiting_customer: "neutral",
  waiting_contract: "neutral",
  waiting_period: "purple",
  friend_cancelled: "danger",
  referrer_no_contract: "warning",
  due: "success",
  sent: "neutral",
  invalid: "danger",
};
const ORDER = ["due", "waiting_period", "referrer_no_contract", "waiting_contract", "waiting_customer", "sent", "friend_cancelled", "invalid"];
const F = "@OData.Community.Display.V1.FormattedValue";
const faDate = (d: Date | string | null | undefined) => (d ? new Date(d).toLocaleDateString("fa-IR", { calendar: "gregory" }) : "—");

export default async function ReferralsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/referrals");
  if (!canAccessPipeline(session.user.role)) redirect("/ops");

  await checkReferrals().catch((e) => console.error("referral check:", e instanceof Error ? e.message : e));
  const referrals = await prisma.referral.findMany({ orderBy: { createdAt: "desc" } });

  // Names: accounts, leads and old-CRM customers involved.
  const userIds = [...new Set(referrals.flatMap((r) => [r.userId, r.referrerUserId, r.voucherSentById]).filter((x): x is string => !!x))];
  const leadIds = referrals.map((r) => r.leadId).filter((x): x is string => !!x);
  const contactIds = [...new Set(referrals.flatMap((r) => [r.referredContactId, r.referrerContactId]).filter((x): x is string => !!x))];
  const [users, leads, contacts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
    prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true, phone: true } }),
    contactIds.length
      ? prisma.crmRecord.findMany({ where: { entity: "contact", OR: contactIds.map((id) => ({ crmId: { equals: id, mode: "insensitive" as const } })) }, select: { crmId: true, data: true } })
      : [],
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const contactName = new Map(
    contacts.map((c) => {
      const d = c.data as Record<string, unknown>;
      return [c.crmId.toLowerCase(), [d.fullname, d.new_customernumber && `#${d.new_customernumber}`].filter(Boolean).join(" ")] as const;
    }),
  );
  const contractNames = new Map(
    (
      await prisma.crmRecord.findMany({
        where: { entity: "opportunity", OR: referrals.filter((r) => r.contractCrmId).map((r) => ({ crmId: { equals: r.contractCrmId!, mode: "insensitive" as const } })) },
        select: { crmId: true, data: true },
      })
    ).map((o) => {
      const d = o.data as Record<string, unknown>;
      return [o.crmId.toLowerCase(), String(d.name ?? d[`_new_category_value${F}`] ?? "قرارداد")] as const;
    }),
  );

  const friendLabel = (r: (typeof referrals)[number]) =>
    (r.referredContactId && contactName.get(r.referredContactId)) ||
    (r.userId && (userById.get(r.userId)?.name || userById.get(r.userId)?.email)) ||
    (r.leadId && leadById.get(r.leadId)?.name) ||
    "—";
  const referrerLabel = (r: (typeof referrals)[number]) =>
    (r.referrerContactId && contactName.get(r.referrerContactId)) || (r.referrerUserId && (userById.get(r.referrerUserId)?.name || userById.get(r.referrerUserId)?.email)) || "—";

  const counts = Object.fromEntries(ORDER.map((s) => [s, referrals.filter((r) => r.status === s).length]));
  const sorted = [...referrals].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">معرفی‌ها و کارت هدیه</h1>
      <p className="mt-1 max-w-[80ch] text-sm leading-relaxed text-secondary">
        کارت هدیه ۱۰ یورویی برای معرف وقتی قابل ارسال است که دوستش قراردادی امضا کند و تا ۱۴ روز فسخ نکند، و خود معرف قرارداد فعال داشته باشد. وضعیت‌ها از CRM قدیم
        خوانده می‌شوند؛ ۱۴ روز از اولین باری شمرده می‌شود که قرارداد دوست امضاشده دیده شد.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {ORDER.filter((s) => counts[s]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-xs">
            <Badge tone={TONE[s]}>{REFERRAL_STATUS_FA[s]}</Badge>
            <span className="font-semibold text-purple-900">{counts[s].toLocaleString("fa-IR")}</span>
          </span>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border-strong bg-tint py-14 text-center">
          <p className="text-sm font-medium text-purple-900">هنوز معرفی‌ای ثبت نشده</p>
          <p className="mx-auto mt-1 max-w-[50ch] text-xs text-secondary">
            وقتی کسی با لینک یا کد معرفی یک مشتری ثبت‌نام کند یا فرم سایت را بفرستد، اینجا می‌آید.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-tint text-right text-xs text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">دوست معرفی‌شده</th>
                <th className="px-4 py-3 font-medium">معرف (کد)</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">قرارداد دوست</th>
                <th className="px-4 py-3 font-medium">تاریخ‌ها</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    {r.referredContactId ? (
                      <Link href={`/ops/customers/${r.referredContactId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                        {friendLabel(r)}
                      </Link>
                    ) : r.leadId ? (
                      <Link href={`/ops/leads/${r.leadId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                        {friendLabel(r)}
                      </Link>
                    ) : (
                      <span className="font-medium text-purple-900">{friendLabel(r)}</span>
                    )}
                    <p className="text-xs text-secondary">{r.leadId ? "فرم سایت" : "حساب سایت / اپ"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {r.referrerContactId ? (
                      <Link href={`/ops/customers/${r.referrerContactId}`} className="text-body hover:text-purple-600 hover:underline">
                        {referrerLabel(r)}
                      </Link>
                    ) : (
                      <span className="text-body">{referrerLabel(r)}</span>
                    )}
                    <p className="font-latin text-xs text-secondary">{r.code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[r.status] ?? "neutral"}>{REFERRAL_STATUS_FA[r.status] ?? r.status}</Badge>
                    {r.status === "waiting_period" && r.statusNote && <p className="mt-1 text-xs text-secondary">تا {faDate(r.statusNote)}</p>}
                    {r.status === "invalid" && r.statusNote && <p className="mt-1 text-xs text-secondary">{r.statusNote}</p>}
                    {r.status === "sent" && (
                      <p className="mt-1 text-xs text-secondary">
                        {faDate(r.voucherSentAt)} · {userById.get(r.voucherSentById ?? "")?.name ?? "—"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.contractCrmId ? (
                      <Link href={`/ops/old-crm/opportunity/${r.contractCrmId}`} className="text-body hover:text-purple-600 hover:underline">
                        {contractNames.get(r.contractCrmId) ?? "قرارداد"}
                      </Link>
                    ) : (
                      "—"
                    )}
                    {r.signedAt && <p className="text-secondary">امضا (دیده‌شده): {faDate(r.signedAt)}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">
                    <p>معرفی: {faDate(r.createdAt)}</p>
                    {r.dueSince && <p>قابل ارسال از: {faDate(r.dueSince)}</p>}
                  </td>
                  <td className="px-4 py-3 text-left">
                    {r.status === "due" && (
                      <form action={markVoucherSent}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="press rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">کارت هدیه فرستاده شد</button>
                      </form>
                    )}
                    {r.status === "sent" && (
                      <form action={undoVoucherSent}>
                        <input type="hidden" name="id" value={r.id} />
                        <button className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-body hover:border-purple-600">برگرداندن</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
