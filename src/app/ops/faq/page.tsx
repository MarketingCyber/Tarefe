import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleFaqPublished, deleteFaq, moveFaq } from "@/lib/faq-actions";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDeleteForm } from "@/components/shared/ConfirmDeleteForm";
import { Question, ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { canAccessContent } from "@/lib/permissions";

/**
 * Phase 9's first CMS admin screen — see prisma/schema.prisma's FaqItem
 * comment for why FAQ specifically was picked as the starting content
 * type. This list is the whole workflow: create, edit, publish/unpublish,
 * reorder, delete — no separate "review" state yet (the plan's 9.2
 * Draft/Translated/Reviewed/Published pipeline is real future scope, not
 * silently dropped, just not built for a first slice this small).
 */
export default async function FaqAdminPage() {
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const items = await prisma.faqItem.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">سوالات متداول</h1>
          <p className="mt-1 text-sm text-secondary">در صفحه اصلی (۴ مورد اول منتشرشده) و صفحه عمومی سوالات متداول نمایش داده می‌شود. فارسی الزامی است؛ آلمانی و روسی اختیاری‌اند.</p>
        </div>
        <Link href="/ops/faq/new" className="press shrink-0 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
          + افزودن سوال
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Question} title="هنوز سوالی ثبت نشده" body="یکی اضافه کن تا صفحه اصلی و صفحه سوالات متداول را پر کنی." actionLabel="+ افزودن سوال" actionHref="/ops/faq/new" />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <div className="mt-0.5 flex shrink-0 flex-col gap-1">
                <form action={moveFaq}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="press text-secondary hover:text-purple-600 disabled:opacity-20" aria-label="جابه‌جایی به بالا">
                    <ArrowUp size={14} weight="bold" />
                  </button>
                </form>
                <form action={moveFaq}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === items.length - 1} className="press text-secondary hover:text-purple-600 disabled:opacity-20" aria-label="جابه‌جایی به پایین">
                    <ArrowDown size={14} weight="bold" />
                  </button>
                </form>
              </div>

              <div className="min-w-0 flex-1">
                <Link href={`/ops/faq/${item.id}`} className="text-sm font-semibold text-purple-900 hover:text-purple-600 hover:underline">
                  {item.questionFa}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-xs text-secondary">{item.answerFa}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={item.published ? "success" : "neutral"}>{item.published ? "منتشرشده" : "پیش‌نویس"}</Badge>
                <form action={toggleFaqPublished}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="published" value={String(item.published)} />
                  <button type="submit" className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
                    {item.published ? "لغو انتشار" : "انتشار"}
                  </button>
                </form>
                <ConfirmDeleteForm
                  action={deleteFaq}
                  id={item.id}
                  message={`حذف «${item.questionFa}»؟ این عملیات قابل بازگشت نیست.`}
                  className="press rounded-full border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-bg"
                >
                  حذف
                </ConfirmDeleteForm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
