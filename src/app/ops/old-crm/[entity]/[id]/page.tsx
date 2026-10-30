import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { displayName, fieldValue, isMirroredTable, relatedRecords, TABLE_LABELS } from "@/lib/dynamics/view";
import type { FormTab } from "@/lib/dynamics/sync";

/**
 * One old-CRM record, laid out like its Dynamics form (same tabs, sections, field order and labels), so operators
 * recognise the screen. Fields that aren't on the form, are hidden there, or are empty are folded away below —
 * never dropped. Beside it: the records that point at this one (a customer's contracts, tickets, notes, points).
 */
export const dynamic = "force-dynamic";

export default async function OldCrmRecordPage({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const { entity, id } = await params;
  if (!isMirroredTable(entity)) notFound();

  const record = await prisma.crmRecord.findUnique({ where: { entity_crmId: { entity, crmId: id } } });
  if (!record) notFound();
  const data = record.data as Record<string, unknown>;
  const [fields, form, related] = await Promise.all([
    prisma.crmField.findMany({ where: { entity }, orderBy: [{ custom: "desc" }, { label: "asc" }] }),
    prisma.crmForm.findUnique({ where: { entity } }),
    relatedRecords(id),
  ]);

  const meta = Object.fromEntries(fields.map((f) => [f.name, f]));
  const row = (name: string, label?: string) => {
    const f = meta[name];
    return { name, label: label || f?.label || name, value: fieldValue(data, name, f?.type ?? "String"), hidden: f?.hidden ?? false };
  };
  type Row = ReturnType<typeof row>;

  // The form's visible, filled fields, section by section; everything else goes to the folded list.
  const tabs = ((form?.layout ?? []) as FormTab[]).filter((t) => !t.hidden);
  const shown = new Set<string>();
  const formTabs = tabs
    .map((t) => ({
      label: t.label,
      sections: t.sections
        .filter((s) => !s.hidden)
        .map((s) => ({ label: s.label, rows: s.fields.filter((f) => !f.hidden).map((f) => row(f.name, f.label)).filter((r) => r.value && !r.hidden) }))
        .filter((s) => s.rows.length),
    }))
    .filter((t) => t.sections.length);
  for (const t of formTabs) for (const s of t.sections) for (const r of s.rows) shown.add(r.name);
  const offForm = fields.map((f) => row(f.name)).filter((r) => !shown.has(r.name));
  const otherFilled = offForm.filter((r) => r.value && !r.hidden);
  const rest = offForm.filter((r) => !r.value || r.hidden);

  const Field = ({ r }: { r: Row }) => (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2.5 text-sm">
      <dt className="text-secondary">
        {r.label}{" "}
        <span className="font-latin text-[11px] text-secondary/70">{r.name}</span>
      </dt>
      <dd className="break-words text-purple-900">
        {r.value?.link ? (
          <Link href={`/ops/old-crm/${r.value.link.entity}/${r.value.link.id}`} className="text-purple-600 hover:underline">{r.value.text}</Link>
        ) : (
          (r.value?.text ?? "—")
        )}
      </dd>
    </div>
  );

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap gap-x-2 text-sm">
        <Link href="/ops/old-crm" className="text-purple-600 hover:underline">CRM قدیم</Link>
        <span className="text-secondary">/</span>
        <Link href={`/ops/old-crm/${entity}`} className="text-purple-600 hover:underline">{TABLE_LABELS[entity] ?? entity}</Link>
      </div>
      <h1 className="mt-1 text-2xl font-bold text-purple-900">{displayName(entity, data)}</h1>
      <p className="mt-1 text-xs text-secondary">
        {record.deletedAt ? "در CRM قدیم حذف شده — " : ""}آخرین تغییر در CRM قدیم:{" "}
        {record.crmModifiedAt ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(record.crmModifiedAt) : "—"}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-6">
          {formTabs.map((t, ti) => (
            <div key={ti} className="space-y-3">
              {t.label && <h2 className="text-base font-bold text-purple-900">{t.label}</h2>}
              {t.sections.map((s, si) => (
                <div key={si} className="overflow-hidden rounded-xl border border-border bg-white">
                  {s.label && <h3 className="border-b border-border bg-tint px-4 py-2 text-sm font-semibold text-purple-900">{s.label}</h3>}
                  <dl className="divide-y divide-border">{s.rows.map((r) => <Field key={r.name} r={r} />)}</dl>
                </div>
              ))}
            </div>
          ))}
          {otherFilled.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-white">
              <h3 className="border-b border-border bg-tint px-4 py-2 text-sm font-semibold text-purple-900">{formTabs.length ? "فیلدهای دیگر (خارج از فرم)" : "فیلدها"}</h3>
              <dl className="divide-y divide-border">{otherFilled.map((r) => <Field key={r.name} r={r} />)}</dl>
            </div>
          )}
          {fields.length === 0 && <p className="text-sm text-secondary">برچسب فیلدها هنوز همگام نشده‌اند.</p>}
          {rest.length > 0 && (
            <details className="mt-3 rounded-xl border border-border bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm text-secondary">{rest.length.toLocaleString("fa-IR")} فیلد خالی یا «استفاده نشود»</summary>
              <dl className="divide-y divide-border border-t border-border">{rest.map((r) => <Field key={r.name} r={r} />)}</dl>
            </details>
          )}
        </section>

        <aside className="space-y-4">
          {Object.entries(related).map(([table, list]) => (
            <section key={table} className="overflow-hidden rounded-xl border border-border bg-white">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-purple-900">
                {TABLE_LABELS[table] ?? table} <span className="font-normal text-secondary">({list.length.toLocaleString("fa-IR")})</span>
              </h2>
              <ul className="divide-y divide-border">
                {list.map((r) => (
                  <li key={r.crmId}>
                    <Link href={`/ops/old-crm/${table}/${r.crmId}`} className="block px-4 py-2.5 text-sm text-purple-900 hover:bg-tint">{displayName(table, r.data)}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
