import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PASSWORD_ERROR_LABEL: Record<string, string> = {
  wrong_current: "رمز عبور فعلی درست نیست.",
  too_short: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد.",
  mismatch: "رمز عبور جدید و تکرار آن یکسان نیستند.",
};

async function updateProfile(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  if (!name) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { name, phone: phone || null } });
  revalidatePath("/app/profile");
}

async function changePassword(formData: FormData): Promise<void> {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  if (!newPassword) return;
  if (newPassword.length < 8) redirect("/app/profile?passwordError=too_short");
  // Server-side, not just the form's own client-side check (there isn't
  // one here — this page is a plain Server Component/action, matching its
  // sibling updateProfile above) — a typo in the confirm field must never
  // silently set a password the person can't actually reproduce.
  if (newPassword !== confirmPassword) redirect("/app/profile?passwordError=mismatch");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  // A Google-only account (passwordHash null, see prisma/schema.prisma's
  // comment) has nothing to verify a "current password" against — this is
  // genuinely a first-time SET, not a change, so that check only applies
  // when a password already exists. The form itself doesn't render the
  // current-password field for this case either (see below), but the
  // server action can't trust that alone.
  if (user.passwordHash) {
    if (!currentPassword) return;
    // A wrong current password used to fail silently — the form would just
    // reload with nothing changed and no explanation, indistinguishable from
    // the request having done nothing at all. Redirecting with an explicit
    // error param (same pattern as callbackUrl elsewhere) gives real feedback
    // instead of a second dead-end right after fixing the login one.
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) redirect("/app/profile?passwordError=wrong_current");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });
  revalidatePath("/app/profile");
}

async function requestAccountDeletion(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;

  // GDPR gives the right to request erasure — it doesn't require every
  // company to grant it instantly, and German commercial/insurance
  // recordkeeping law (HGB retention periods) means a broker like this one
  // likely has to keep contract-related records for years regardless of a
  // deletion request. An automated instant self-delete would either have
  // to ignore that (real legal risk for the business) or silently fail to
  // actually delete anything while claiming success (dishonest). Routing
  // this to staff as a real, trackable ticket is the choice that's
  // actually true to what can happen next.
  const reason = (formData.get("reason") as string)?.trim();
  const ticket = await prisma.serviceRequest.create({
    data: {
      customerId: session.user.id,
      subjectType: "account_deletion",
      subject: "درخواست حذف حساب کاربری",
      description: reason || undefined,
      priority: "HIGH",
    },
  });
  await prisma.activityLog.create({
    data: { entityType: "service_request", entityId: ticket.id, action: "created", note: "درخواست حذف حساب توسط مشتری ثبت شد", actorId: session.user.id },
  });
  redirect("/app/profile?deletionRequested=1");
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ passwordError?: string; deletionRequested?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/app/profile");

  const { passwordError, deletionRequested } = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return (
    <div dir="rtl" className="container-page max-w-2xl py-8">
      <h1 className="text-2xl font-bold text-purple-900">پروفایل</h1>
      <p className="mt-1 text-sm text-secondary">اطلاعات حساب کاربری خود را مدیریت کن.</p>

      <form action={updateProfile} className="mt-6 grid gap-4 rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-bold text-purple-900">اطلاعات شخصی</h2>
        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-body">
            ایمیل
          </label>
          {/* Read-only: email is the sign-in identifier — changing it needs its own
              verification flow (confirm the new address before it takes effect),
              which doesn't exist yet. Editable name/phone need no such flow. */}
          <input id="email" value={user.email} disabled className="font-latin rounded-lg border border-border bg-tint px-3.5 py-2.5 text-sm text-secondary" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="name" className="text-xs font-semibold text-body">
            نام
          </label>
          <input
            id="name"
            name="name"
            defaultValue={user.name}
            required
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="phone" className="text-xs font-semibold text-body">
            شماره تماس
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={user.phone ?? ""}
            className="font-latin rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
        </div>
        <button type="submit" className="press mt-1 w-fit rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">
          ذخیره تغییرات
        </button>
      </form>

      <form action={changePassword} className="mt-6 grid gap-4 rounded-2xl border border-border bg-white p-6">
        <div>
          <h2 className="text-sm font-bold text-purple-900">{user.passwordHash ? "تغییر رمز عبور" : "تنظیم رمز عبور"}</h2>
          {!user.passwordHash && (
            <p className="mt-1 text-xs text-secondary">
              حساب تو با گوگل ساخته شده و رمز عبوری ندارد. اینجا می‌تونی یک رمز عبور تنظیم کنی تا بتونی با ایمیل هم وارد بشی.
            </p>
          )}
        </div>
        {passwordError && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {PASSWORD_ERROR_LABEL[passwordError] ?? "تغییر رمز عبور با خطا مواجه شد."}
          </p>
        )}
        {user.passwordHash && (
          <div className="grid gap-1.5">
            <label htmlFor="currentPassword" className="text-xs font-semibold text-body">
              رمز عبور فعلی
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <label htmlFor="newPassword" className="text-xs font-semibold text-body">
            رمز عبور جدید (حداقل ۸ کاراکتر)
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={8}
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="confirmPassword" className="text-xs font-semibold text-body">
            تکرار رمز عبور جدید
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
        </div>
        <button type="submit" className="press mt-1 w-fit rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-purple-900 hover:border-purple-600">
          {user.passwordHash ? "تغییر رمز عبور" : "تنظیم رمز عبور"}
        </button>
      </form>

      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-bold text-purple-900">حریم خصوصی و داده‌ها</h2>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold text-purple-900">دریافت کپی از اطلاعاتم</p>
            <p className="mt-1 text-xs text-secondary">فایل کامل قراردادها، درخواست‌ها، مدارک و اطلاعات پروفایل خودت را دانلود کن.</p>
          </div>
          <a
            href="/api/account/export"
            className="press flex shrink-0 items-center gap-1.5 rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-purple-900 hover:border-purple-600"
          >
            <DownloadSimple size={14} />
            دانلود
          </a>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-purple-900">درخواست حذف حساب کاربری</p>
          <p className="mt-1 text-xs text-secondary">
            به دلیل الزامات قانونی نگهداری اسناد قراردادی در آلمان، حذف حساب به‌صورت خودکار انجام نمی‌شود — درخواست تو مستقیم برای بررسی به تیم ما ارسال می‌شود.
          </p>
          {deletionRequested ? (
            <p className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-xs font-medium text-success">درخواست تو ثبت شد. تیم ما به‌زودی با تو تماس می‌گیرد.</p>
          ) : (
            <form action={requestAccountDeletion} className="mt-3 grid gap-2">
              <textarea
                name="reason"
                rows={2}
                placeholder="دلیل درخواست (اختیاری)"
                className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
              />
              <button type="submit" className="press w-fit rounded-full border border-danger/40 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger-bg">
                ثبت درخواست حذف حساب
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
