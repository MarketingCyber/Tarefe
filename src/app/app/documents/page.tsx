import { redirect } from "next/navigation";
import { Folder, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const TYPE_LABEL: Record<string, string> = {
  CONTRACT: "قرارداد",
  POLICY: "بیمه‌نامه",
  INVOICE: "فاکتور",
  LETTER: "نامه",
  ID_DOC: "مدرک هویتی",
  CERTIFICATE: "گواهی",
  OTHER: "سایر",
};

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/app/documents");

  const documents = await prisma.document.findMany({
    where: { ownerId: session.user.id },
    orderBy: { uploadedAt: "desc" },
    include: { contract: { select: { provider: true, productName: true } } },
  });

  return (
    <div dir="rtl" className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">مدارک</h1>
      <p className="mt-1 text-sm text-secondary">قراردادها، بیمه‌نامه‌ها و فاکتورهای شما، در یک جا.</p>

      {documents.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-tint py-16 text-center">
          <Folder size={32} className="text-secondary" />
          <p className="text-sm font-medium text-purple-900">هنوز مدرکی ثبت نشده</p>
          <p className="max-w-[36ch] text-xs text-secondary">مدارک مربوط به قراردادهای تو، پس از تکمیل فرآیند، اینجا نمایش داده می‌شوند.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
              <div>
                <p className="text-sm font-semibold text-purple-900">{doc.title}</p>
                <p className="text-xs text-secondary">
                  {TYPE_LABEL[doc.type] ?? doc.type}
                  {doc.contract && ` · ${doc.contract.provider} ${doc.contract.productName}`} · {doc.uploadedAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}
                </p>
              </div>
              {doc.fileUrl ? (
                <a
                  href={`/api/documents/${doc.id}`}
                  className="press flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-purple-900 hover:border-purple-600"
                >
                  <DownloadSimple size={14} />
                  دانلود
                </a>
              ) : (
                <span className="text-xs text-secondary">در حال آماده‌سازی</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
