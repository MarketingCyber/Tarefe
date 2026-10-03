import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleTestimonialPublished, deleteTestimonial, moveTestimonial } from "@/lib/testimonial-actions";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDeleteForm } from "@/components/shared/ConfirmDeleteForm";
import { ChatCircleText, ArrowUp, ArrowDown, Star } from "@phosphor-icons/react/dist/ssr";
import { canAccessContent } from "@/lib/permissions";

/**
 * Phase 9's second CMS content type — see prisma/schema.prisma's
 * Testimonial comment for why this exists and the consent-note field.
 * Deliberately starts empty: nothing is seeded here (contrast FaqItem),
 * because there was nothing real to migrate — this is the tool that
 * replaces the "coming soon" placeholder in
 * src/components/home/Testimonials.tsx once staff add something real.
 */
export default async function TestimonialsAdminPage() {
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const items = await prisma.testimonial.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">نظرات مشتریان</h1>
          <p className="mt-1 max-w-2xl text-sm text-secondary">
            بازخورد واقعی و منتشرشده مشتریان که در صفحه اصلی نمایش داده می‌شود. هیچ‌کدام از این‌ها نمونه یا جای‌گیرنده نیست — فقط چیزی را اضافه کن که یک
            مشتری واقعی، با اجازه خودش، واقعاً گفته است.
          </p>
        </div>
        <Link href="/ops/testimonials/new" className="press shrink-0 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
          + افزودن نظر
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={ChatCircleText}
            title="هنوز نظری ثبت نشده"
            body="تا زمانی که یک نظر واقعی اینجا اضافه نکنی، صفحه اصلی یک پیام صادقانه «هنوز نظری نیست» نشان می‌دهد."
            actionLabel="+ افزودن نظر"
            actionHref="/ops/testimonials/new"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
              <div className="mt-0.5 flex shrink-0 flex-col gap-1">
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" disabled={i === 0} className="press text-secondary hover:text-purple-600 disabled:opacity-20" aria-label="جابه‌جایی به بالا">
                    <ArrowUp size={14} weight="bold" />
                  </button>
                </form>
                <form action={moveTestimonial}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button type="submit" disabled={i === items.length - 1} className="press text-secondary hover:text-purple-600 disabled:opacity-20" aria-label="جابه‌جایی به پایین">
                    <ArrowDown size={14} weight="bold" />
                  </button>
                </form>
              </div>

              <div className="min-w-0 flex-1">
                <Link href={`/ops/testimonials/${item.id}`} className="text-sm font-semibold text-purple-900 hover:text-purple-600 hover:underline">
                  {item.customerName}
                </Link>
                {item.rating && (
                  <span className="ms-2 inline-flex items-center gap-0.5 text-xs text-warning">
                    <Star size={12} weight="fill" /> {item.rating}/5
                  </span>
                )}
                <p className="mt-0.5 line-clamp-1 text-xs text-secondary">{item.quoteFa}</p>
                {!item.consentNote && <p className="mt-1 text-[11px] font-medium text-warning">یادداشت رضایت ثبت نشده</p>}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={item.published ? "success" : "neutral"}>{item.published ? "منتشرشده" : "پیش‌نویس"}</Badge>
                <form action={toggleTestimonialPublished}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="published" value={String(item.published)} />
                  <button type="submit" className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
                    {item.published ? "لغو انتشار" : "انتشار"}
                  </button>
                </form>
                <ConfirmDeleteForm
                  action={deleteTestimonial}
                  id={item.id}
                  message={`حذف نظر «${item.customerName}»؟ این عملیات قابل بازگشت نیست.`}
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
