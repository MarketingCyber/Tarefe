import Link from "next/link";
import { redirect } from "next/navigation";
import { MagnifyingGlass, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge } from "@/components/shared/Badge";
import { canAccessPipeline } from "@/lib/permissions";
import { emailKey, personKeys, phoneKey } from "@/lib/dynamics/identity";
import { shown } from "@/components/crm/customer/OldCrmParts";

/**
 * Customers across both CRMs, each linking to its Customer 360 (/ops/customers/[id]). The old CRM's contacts
 * (Dynamics mirror) are the customer base; tarefe.de accounts that match one (same e-mail or phone) are shown on
 * that row, accounts that match none are listed below as "only on the site / app". Search covers name, e-mail,
 * phone (any notation), customer number and every other field of the contact.
 */
export const dynamic = "force-dynamic";

const PAGE = 50;
type ContactRow = { crmId: string; data: Record<string, unknown> };

export default async function OpsCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const { q: rawQ, page: rawPage } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const page = Math.max(1, Number(rawPage) || 1);
  const keys = [emailKey(q), phoneKey(q)].filter((k): k is string => !!k);

  // Old-CRM contacts: by identity key (exact e-mail / phone in any notation) or by text anywhere in the record.
  const where = q
    ? prisma.$queryRaw<ContactRow[]>`
        SELECT "crmId", data FROM crm_records
        WHERE entity = 'contact' AND "deletedAt" IS NULL
          AND (refs && ${keys}::text[] OR data::text ILIKE ${`%${q.replace(/[%_\\]/g, "\\$&")}%`})
        ORDER BY "crmModifiedAt" DESC NULLS LAST LIMIT ${PAGE + 1} OFFSET ${(page - 1) * PAGE}`
    : prisma.$queryRaw<ContactRow[]>`
        SELECT "crmId", data FROM crm_records WHERE entity = 'contact' AND "deletedAt" IS NULL
        ORDER BY "crmModifiedAt" DESC NULLS LAST LIMIT ${PAGE + 1} OFFSET ${(page - 1) * PAGE}`;
  const [found, totalContacts] = await Promise.all([where, prisma.crmRecord.count({ where: { entity: "contact", deletedAt: null } })]);
  const contacts = found.slice(0, PAGE);
  const hasNext = found.length > PAGE;
  const ids = contacts.map((c) => c.crmId.toLowerCase());

  // Per contact on this page: contracts and tickets in the old CRM, and whether a tarefe.de account matches.
  const counts = ids.length
    ? await prisma.$queryRaw<{ entity: string; ref: string; n: bigint }[]>`
        SELECT entity, ref, count(*) AS n FROM crm_records, unnest(refs) AS ref
        WHERE entity IN ('opportunity', 'incident') AND "deletedAt" IS NULL AND refs && ${ids}::text[] AND ref = ANY(${ids}::text[])
        GROUP BY entity, ref`
    : [];
  const count = (entity: string, id: string) => Number(counts.find((c) => c.entity === entity && c.ref === id.toLowerCase())?.n ?? 0);

  const users = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { contracts: true, serviceRequests: true, applications: true } } },
  });
  // Which accounts are the same person as an old-CRM contact (on this page or anywhere in the old CRM).
  const userKeys = new Map(users.map((u) => [u.id, [emailKey(u.email), phoneKey(u.phone)].filter((k): k is string => !!k)]));
  const allUserKeys = [...new Set([...userKeys.values()].flat())];
  const linkedContacts = allUserKeys.length
    ? await prisma.crmRecord.findMany({ where: { entity: "contact", deletedAt: null, refs: { hasSome: allUserKeys } }, select: { crmId: true, refs: true } })
    : [];
  const linkedKeys = new Set(linkedContacts.flatMap((c) => c.refs));
  const siteOnly = users.filter((u) => !(userKeys.get(u.id) ?? []).some((k) => linkedKeys.has(k))).slice(0, PAGE);
  const contactHasAccount = (c: ContactRow) => personKeys(c.data).some((k) => allUserKeys.includes(k));

  const pageHref = (p: number) => `/ops/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">مشتریان</h1>
      <p className="mt-1 text-sm text-secondary">
        همه مشتریان CRM قدیم ({totalContacts.toLocaleString("fa-IR")} نفر) همراه با حساب‌های سایت و اپ — هر ردیف به پروفایل کامل مشتری می‌رود.
      </p>

      <form className="mt-6 flex max-w-xl items-center gap-2 rounded-full border border-border-strong bg-white px-4 py-2 focus-within:border-purple-600" role="search">
        <MagnifyingGlass size={16} className="shrink-0 text-secondary" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="نام، ایمیل، تلفن، شماره مشتری…"
          aria-label="جستجوی مشتری"
          className="min-w-0 flex-1 bg-transparent text-sm text-purple-900 outline-none placeholder:text-secondary"
        />
        <button type="submit" className="press rounded-full bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-purple-900">
          جستجو
        </button>
      </form>

      {contacts.length === 0 && siteOnly.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={UsersThree} title={q ? `مشتری‌ای با «${q}» پیدا نشد` : "هنوز مشتری‌ای ثبت نشده"} body={q ? "نام، ایمیل یا شماره تلفن را به شکل دیگری امتحان کنید." : "مشتریان CRM قدیم بعد از همگام‌سازی همین‌جا نمایش داده می‌شوند."} />
        </div>
      ) : (
        <>
          {contacts.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-secondary">
                    <th className="px-4 py-3 text-start font-medium">نام</th>
                    <th className="px-4 py-3 text-start font-medium">شماره مشتری</th>
                    <th className="px-4 py-3 text-start font-medium">اطلاعات تماس</th>
                    <th className="px-4 py-3 text-start font-medium">شهر</th>
                    <th className="px-4 py-3 text-start font-medium">قراردادها</th>
                    <th className="px-4 py-3 text-start font-medium">تیکت‌ها</th>
                    <th className="px-4 py-3 text-start font-medium">مسئول</th>
                    <th className="px-4 py-3 text-start font-medium">حساب سایت / اپ</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.crmId} className="border-b border-border last:border-0 hover:bg-tint/50">
                      <td className="px-4 py-3 font-medium text-purple-900">
                        <Link href={`/ops/customers/${c.crmId}`} className="hover:text-purple-600 hover:underline">
                          {shown(c.data, "fullname") ?? "بدون نام"}
                        </Link>
                      </td>
                      <td className="font-latin px-4 py-3 text-xs text-secondary">{shown(c.data, "new_customernumber") ?? "—"}</td>
                      <td className="font-latin px-4 py-3 text-xs text-secondary">
                        {shown(c.data, "emailaddress1") ?? ""}
                        <br />
                        {shown(c.data, "mobilephone") ?? shown(c.data, "telephone1") ?? ""}
                      </td>
                      <td className="px-4 py-3 text-xs text-secondary">{shown(c.data, "new_stadt") ?? "—"}</td>
                      <td className="px-4 py-3 tabular-nums text-secondary">{count("opportunity", c.crmId).toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 tabular-nums text-secondary">{count("incident", c.crmId).toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-3 text-xs text-secondary">{shown(c.data, "ownerid") ?? "—"}</td>
                      <td className="px-4 py-3">{contactHasAccount(c) ? <Badge tone="success">دارد</Badge> : <span className="text-xs text-secondary">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(page > 1 || hasNext) && (
            <div className="mt-4 flex items-center gap-3 text-sm">
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="font-medium text-purple-600 hover:underline">
                  صفحه قبل
                </Link>
              )}
              <span className="text-secondary">صفحه {page.toLocaleString("fa-IR")}</span>
              {hasNext && (
                <Link href={pageHref(page + 1)} className="font-medium text-purple-600 hover:underline">
                  صفحه بعد
                </Link>
              )}
            </div>
          )}

          {page === 1 && siteOnly.length > 0 && (
            <>
              <h2 className="mt-10 text-sm font-bold text-purple-900">فقط در سایت / اپ ({siteOnly.length.toLocaleString("fa-IR")})</h2>
              <p className="mt-1 text-xs text-secondary">حساب‌هایی که با همین ایمیل یا شماره تلفن در CRM قدیم پیدا نشدند.</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-secondary">
                      <th className="px-4 py-3 text-start font-medium">نام</th>
                      <th className="px-4 py-3 text-start font-medium">اطلاعات تماس</th>
                      <th className="px-4 py-3 text-start font-medium">قراردادها</th>
                      <th className="px-4 py-3 text-start font-medium">درخواست‌ها</th>
                      <th className="px-4 py-3 text-start font-medium">تیکت‌ها</th>
                      <th className="px-4 py-3 text-start font-medium">تاریخ عضویت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteOnly.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-tint/50">
                        <td className="px-4 py-3 font-medium text-purple-900">
                          <Link href={`/ops/customers/${u.id}`} className="hover:text-purple-600 hover:underline">
                            {u.name}
                          </Link>
                        </td>
                        <td className="font-latin px-4 py-3 text-xs text-secondary">
                          {u.email}
                          <br />
                          {u.phone ?? ""}
                        </td>
                        <td className="px-4 py-3 text-secondary">{u._count.contracts}</td>
                        <td className="px-4 py-3 text-secondary">{u._count.applications}</td>
                        <td className="px-4 py-3 text-secondary">{u._count.serviceRequests}</td>
                        <td className="px-4 py-3 text-xs text-secondary">{u.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
