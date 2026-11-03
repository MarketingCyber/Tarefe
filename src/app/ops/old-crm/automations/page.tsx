import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { AUTOMATIONS, type Action, type RunResult } from "@/lib/automations/shadow";
import { crmUsers } from "@/lib/crm/crm-users";
import { Badge } from "@/components/shared/Badge";

/**
 * Old-CRM automations in test mode (lib/automations/shadow.ts): per automation and day, what our code would have done
 * next to what Dynamics did — matched, different (same record, other owner / customer / version), missing (we'd
 * have, Dynamics didn't) and extra (Dynamics did, we wouldn't have). Nothing here writes to Dynamics. The exit
 * criterion for an automation to take over is a run of days with nothing unexplained.
 */
export const dynamic = "force-dynamic";

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100).toLocaleString("fa-IR")}٪` : "—");
const STATE_FA: Record<string, string> = { "0": "فعال", "1": "Won", "2": "پایان‌یافته" };
const FIELD_FA: Record<string, string> = { variant: "نسخه تسک", ownerId: "مسئول", customerId: "مشتری" };
const VARIANT_FA: Record<string, string> = { aktuell: "Aktuell", "aktuell-t": "Aktuell T" };

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<{ a?: string; day?: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const { a, day } = await searchParams;
  const automation = AUTOMATIONS.find((x) => x.key === a) ?? AUTOMATIONS[0];

  const runs = await prisma.automationRun.findMany({ where: { automation: automation.key }, orderBy: { day: "desc" }, take: 45 });
  const selected = day ? runs.find((r) => r.day === day) : null;
  const users = selected ? await crmUsers() : [];
  const userName = (id: unknown) => users.find((u) => u.id === id)?.name ?? (id ? String(id).slice(0, 8) : "—");
  const show = (field: string, v: unknown) => (field === "ownerId" ? userName(v) : field === "variant" ? (VARIANT_FA[String(v)] ?? String(v ?? "—")) : String(v ?? "—"));

  const checked = runs.filter((r) => r.checkedAt && r.result);
  const live = checked.filter((r) => !r.retro);
  const totals = (list: typeof checked) =>
    list.reduce(
      (t, r) => {
        const res = r.result as RunResult;
        return { expected: t.expected + (r.expected as Action[]).length, matched: t.matched + res.matched.length, issues: t.issues + res.mismatched.length + res.missing.length + res.extra.length };
      },
      { expected: 0, matched: 0, issues: 0 },
    );
  const liveTotals = totals(live);

  return (
    <div className="container-page py-8">
      <Link href="/ops/old-crm" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        CRM قدیم
      </Link>
      <h1 className="text-2xl font-bold text-purple-900">اتوماسیون‌ها در حالت آزمایشی</h1>
      <p className="mt-1 max-w-3xl text-sm text-secondary">
        هر اتوماسیون CRM قدیم این‌جا دوباره ساخته می‌شود و هر روز، پیش از اجرای Dynamics، فهرست کارهایی که انجام می‌داد ثبت می‌شود؛ بعد با کاری که Dynamics واقعاً
        کرد مقایسه می‌شود. هیچ چیزی در Dynamics نوشته نمی‌شود. وقتی چند هفته بدون اختلاف توضیح‌داده‌نشده بگذرد، اتوماسیون آماده جایگزینی است.
      </p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        {AUTOMATIONS.map((x) => (
          <Link
            key={x.key}
            href={`/ops/old-crm/automations?a=${x.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${x.key === automation.key ? "border-purple-600 bg-purple-600 text-white" : "border-border-strong text-purple-900 hover:border-purple-600"}`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-white p-5">
        <h2 className="text-sm font-bold text-purple-900">{automation.label}</h2>
        <p className="mt-1 text-sm text-secondary">{automation.description}</p>
        <p className="mt-3 text-sm">
          {live.length ? (
            <>
              روزهای واقعی: {live.length.toLocaleString("fa-IR")} — {pct(liveTotals.matched, liveTotals.expected)} مطابق ({liveTotals.matched.toLocaleString("fa-IR")} از{" "}
              {liveTotals.expected.toLocaleString("fa-IR")})، {liveTotals.issues.toLocaleString("fa-IR")} مورد اختلاف
            </>
          ) : (
            <span className="text-secondary">اولین مقایسه واقعی فردا صبح بعد از ساعت ۷ انجام می‌شود. روزهای «تخمینی» از داده‌های امروز ساخته شده‌اند.</span>
          )}
        </p>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="px-4 py-3 text-start font-medium">روز</th>
              <th className="px-4 py-3 text-start font-medium">برنامه ما</th>
              <th className="px-4 py-3 text-start font-medium">مطابق</th>
              <th className="px-4 py-3 text-start font-medium">متفاوت</th>
              <th className="px-4 py-3 text-start font-medium">Dynamics انجام نداد</th>
              <th className="px-4 py-3 text-start font-medium">فقط Dynamics</th>
              <th className="px-4 py-3 text-start font-medium">تطابق</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const res = r.result as RunResult | null;
              const expected = (r.expected as Action[]).length;
              return (
                <tr key={r.id} className={`border-b border-border last:border-0 ${r.day === day ? "bg-tint/60" : "hover:bg-tint/40"}`}>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Link href={`/ops/old-crm/automations?a=${automation.key}&day=${r.day}`} className="font-latin font-medium text-purple-900 hover:underline">
                      {r.day}
                    </Link>{" "}
                    {r.retro && <Badge>تخمینی</Badge>}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{expected.toLocaleString("fa-IR")}</td>
                  {res ? (
                    <>
                      <td className="px-4 py-2.5 tabular-nums text-success">{res.matched.length.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums">{res.mismatched.length.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums">{res.missing.length.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums">{res.extra.length.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-purple-900">{pct(res.matched.length, expected + res.extra.length)}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="px-4 py-2.5 text-xs text-secondary">
                      در انتظار اجرای Dynamics (مقایسه بعد از ساعت {automation.checkFromHour.toLocaleString("fa-IR")})
                    </td>
                  )}
                </tr>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-secondary">
                  هنوز اجرایی ثبت نشده.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && selected.result != null && (
        <DayDetails day={selected.day} retro={selected.retro} result={selected.result as RunResult} expected={selected.expected as Action[]} show={show} />
      )}
    </div>
  );
}

function DayDetails({ day, retro, result, expected, show }: { day: string; retro: boolean; result: RunResult; expected: Action[]; show: (f: string, v: unknown) => string }) {
  const stateOf = new Map(expected.map((e) => [e.key, String(e.fields.state ?? "")]));
  // How the "missing" ones split by contract status — tells whether Dynamics skips e.g. Won contracts.
  const missingByState = result.missing.reduce<Record<string, number>>((m, x) => ({ ...m, [String(x.fields.state)]: (m[String(x.fields.state)] ?? 0) + 1 }), {});
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold text-purple-900">
        جزئیات <span className="font-latin">{day}</span> {retro && <Badge>تخمینی — وضعیت قراردادها ممکن است از آن روز تغییر کرده باشد</Badge>}
      </h2>

      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <Group title={`Dynamics انجام نداد (${result.missing.length.toLocaleString("fa-IR")})`} note={Object.keys(missingByState).length ? `بر اساس وضعیت قرارداد: ${Object.entries(missingByState).map(([s, n]) => `${STATE_FA[s] ?? s} ${n.toLocaleString("fa-IR")}`).join("، ")}` : undefined}>
          {result.missing.map((m) => (
            <Item key={m.key} href={`/ops/contracts/${m.key}`} name={m.name} meta={`${STATE_FA[String(m.fields.state)] ?? ""} · ${String(m.fields.step ?? "")} · ${show("ownerId", m.fields.ownerId)}`} />
          ))}
        </Group>
        <Group title={`فقط Dynamics (${result.extra.length.toLocaleString("fa-IR")})`} note="Dynamics تسک ساخت ولی برنامه ما نه — مثلاً قراردادی که وضعیتش از آن روز تغییر کرده.">
          {result.extra.map((x) => (
            <Item key={x.key} href={`/ops/contracts/${x.key}`} name={x.name} meta={`${show("variant", x.fields.variant)} · ${show("ownerId", x.fields.ownerId)}`} />
          ))}
        </Group>
        <Group title={`متفاوت (${result.mismatched.length.toLocaleString("fa-IR")})`} note="همان قرارداد، ولی یک فیلد فرق دارد.">
          {result.mismatched.map((m) => (
            <Item
              key={m.key}
              href={`/ops/contracts/${m.key}`}
              name={m.name}
              meta={m.diffs
                .map((d) => (d.field === "customerId" ? "مشتری متفاوت" : `${FIELD_FA[d.field] ?? d.field}: ما «${show(d.field, d.expected)}»، Dynamics «${show(d.field, d.actual)}»`))
                .join(" — ")}
            />
          ))}
        </Group>
        <Group title={`مطابق (${result.matched.length.toLocaleString("fa-IR")})`}>
          {result.matched.slice(0, 40).map((m) => (
            <Item key={m.key} href={`/ops/contracts/${m.key}`} name={m.name} meta={STATE_FA[stateOf.get(m.key) ?? ""] ?? ""} />
          ))}
          {result.matched.length > 40 && <p className="px-3 py-2 text-xs text-secondary">و {(result.matched.length - 40).toLocaleString("fa-IR")} مورد دیگر</p>}
        </Group>
      </div>
    </section>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-xs font-bold text-purple-900">{title}</h3>
        {note && <p className="mt-0.5 text-xs text-secondary">{note}</p>}
      </div>
      <ul className="max-h-96 divide-y divide-border overflow-y-auto">{children}</ul>
    </div>
  );
}

function Item({ href, name, meta }: { href: string; name: string; meta: string }) {
  return (
    <li className="px-4 py-2 text-sm">
      <Link href={href} className="font-medium text-body hover:text-purple-600 hover:underline">
        {name}
      </Link>
      {meta && <span className="block text-xs text-secondary">{meta}</span>}
    </li>
  );
}
