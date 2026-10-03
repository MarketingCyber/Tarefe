import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PlusCircle } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { trackServer } from "@/lib/analytics-server";
import { EVENT } from "@/lib/analytics";

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "دریافت‌شده",
  UNDER_REVIEW: "در حال بررسی",
  SENT_TO_PROVIDER: "ارسال‌شده به ارائه‌دهنده",
  PROVIDER_PROCESSING: "در حال پردازش",
  COMPLETED: "تکمیل‌شده",
};
const STATUS_TONE: Record<string, BadgeTone> = {
  RECEIVED: "purple",
  UNDER_REVIEW: "neutral",
  SENT_TO_PROVIDER: "warning",
  PROVIDER_PROCESSING: "warning",
  COMPLETED: "success",
};

const SUBJECT_TYPES: { value: string; label: string }[] = [
  { value: "cancellation", label: "فسخ قرارداد" },
  { value: "address_change", label: "تغییر آدرس" },
  { value: "invoice_question", label: "سوال درباره فاکتور" },
  { value: "claim_report", label: "ثبت خسارت" },
  { value: "other", label: "موضوع دیگر" },
];

async function createTicket(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  const subjectType = formData.get("subjectType") as string;
  const subject = (formData.get("subject") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  if (!subject) return;

  const contractId = (formData.get("contractId") as string) || undefined;
  const ticket = await prisma.serviceRequest.create({
    data: { customerId: session.user.id, subjectType, subject, description: description || undefined, contractId },
  });
  await prisma.activityLog.create({
    data: { entityType: "service_request", entityId: ticket.id, action: "created", note: "درخواست توسط مشتری ثبت شد", actorId: session.user.id },
  });
  await trackServer(EVENT.TICKET_CREATED, { userId: session.user.id, metadata: { ticketId: ticket.id, subjectType } });
  revalidatePath("/app/support");
}

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ contractId?: string }> }) {
  const session = await auth();
  // See PortalDashboard (app/page.tsx) — same fix, same reason: don't trust
  // the layout's auth gate blindly here, auth() has been seen returning
  // null on a fresh-login race.
  if (!session?.user?.id) redirect("/login?callbackUrl=/app/support");
  const userId = session.user.id;
  const { contractId: preselectedContractId } = await searchParams;

  const [tickets, contracts] = await Promise.all([
    prisma.serviceRequest.findMany({ where: { customerId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.contract.findMany({ where: { customerId: userId }, select: { id: true, provider: true, productName: true } }),
  ]);

  return (
    <div dir="rtl" className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">پشتیبانی</h1>
      <p className="mt-1 text-sm text-secondary">درخواست‌های خود را اینجا پیگیری کن یا درخواست جدید ثبت کن.</p>

      <div className="mt-8 grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          {tickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-tint py-14 text-center">
              <p className="text-sm text-secondary">هنوز درخواستی ثبت نکرده‌ای.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/app/support/${ticket.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600"
                >
                  <div>
                    <p className="text-sm font-semibold text-purple-900">{ticket.subject}</p>
                    <p className="text-xs text-secondary">{ticket.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</p>
                  </div>
                  <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status] ?? ticket.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-purple-900">
            <PlusCircle size={18} />
            درخواست جدید
          </h2>
          <form action={createTicket} className="grid gap-3">
            <select name="subjectType" required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900">
              {SUBJECT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {contracts.length > 0 && (
              <select name="contractId" defaultValue={preselectedContractId ?? ""} className="rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900">
                <option value="">بدون ارتباط با قرارداد خاص</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.provider} — {c.productName}
                  </option>
                ))}
              </select>
            )}
            <input
              name="subject"
              required
              placeholder="موضوع درخواست"
              className="rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
            />
            <textarea
              name="description"
              rows={3}
              placeholder="توضیحات (اختیاری)"
              className="rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
            />
            <button type="submit" className="press rounded-full bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">
              ثبت درخواست
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
