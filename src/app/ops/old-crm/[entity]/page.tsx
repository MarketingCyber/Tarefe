import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { displayName, isMirroredTable, TABLE_LABELS } from "@/lib/dynamics/view";

/** One old-CRM table: newest first, with a search over every field (name, phone, email, contract number …). */
export const dynamic = "force-dynamic";
const PAGE = 50;

type Row = { crmId: string; data: Record<string, unknown>; crmModifiedAt: Date | null };

export default async function OldCrmTablePage({ params, searchParams }: { params: Promise<{ entity: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const { entity } = await params;
  if (!isMirroredTable(entity)) notFound();
  const { q = "", page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const query = q.trim();

  const rows = query
    ? await prisma.$queryRaw<Row[]>`
        SELECT "crmId", data, "crmModifiedAt" FROM crm_records
        WHERE entity = ${entity} AND "deletedAt" IS NULL AND data::text ILIKE ${`%${query}%`}
        ORDER BY "crmModifiedAt" DESC NULLS LAST LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`
    : ((await prisma.crmRecord.findMany({
        where: { entity, deletedAt: null },
        orderBy: { crmModifiedAt: { sort: "desc", nulls: "last" } },
        take: PAGE,
        skip: (page - 1) * PAGE,
        select: { crmId: true, data: true, crmModifiedAt: true },
      })) as Row[]);
  const total = await prisma.crmRecord.count({ where: { entity, deletedAt: null } });

  const link = (p: number) => `/ops/old-crm/${entity}?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`;

  return (
    <div className="container-page py-8">
      <Link href="/ops/old-crm" className="text-sm text-purple-600 hover:underline">CRM قدیم</Link>
      <h1 className="mt-1 text-2xl font-bold text-purple-900">{TABLE_LABELS[entity] ?? entity}</h1>
      <p className="mt-1 text-sm text-secondary">{total.toLocaleString("fa-IR")} رکورد</p>

      <form className="mt-5 flex gap-2" action={`/ops/old-crm/${entity}`}>
        <input name="q" defaultValue={query} placeholder="جستجو در همه فیلدها: نام، ایمیل، تلفن، شماره قرارداد…" className="w-full max-w-md rounded-xl border border-border bg-white px-4 py-2.5 text-sm outline-none focus:border-purple-600" />
        <button className="press rounded-xl bg-purple-600 px-5 text-sm font-semibold text-white hover:bg-purple-900">جستجو</button>
      </form>

      <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-secondary">رکوردی پیدا نشد.</li>}
        {rows.map((r) => (
          <li key={r.crmId}>
            <Link href={`/ops/old-crm/${entity}/${r.crmId}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-tint">
              <span className="font-medium text-purple-900">{displayName(entity, r.data)}</span>
              <span className="shrink-0 text-xs text-secondary">{r.crmModifiedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeZone: "Europe/Berlin" }).format(r.crmModifiedAt) : ""}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-3 text-sm">
        {page > 1 && <Link href={link(page - 1)} className="text-purple-600 hover:underline">صفحه قبل</Link>}
        {rows.length === PAGE && <Link href={link(page + 1)} className="text-purple-600 hover:underline">صفحه بعد</Link>}
      </div>
    </div>
  );
}
