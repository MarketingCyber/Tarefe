import { redirect } from "next/navigation";
import { UserPlus, ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/shared/Badge";
import { ConfirmDeleteForm } from "@/components/shared/ConfirmDeleteForm";
import { AdminResetPasswordForm } from "@/components/crm/AdminResetPasswordForm";
import { ROLE_FA } from "@/lib/status-labels";
import { createStaffAccount, changeRole, setAccessActive, resetStaffMfa } from "@/lib/team-actions";

const TEAM_ERROR_LABEL: Record<string, string> = {
  too_short: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
  mismatch: "رمز عبور و تکرار آن یکسان نیستند.",
  email_taken: "این ایمیل قبلاً ثبت شده.",
};

/**
 * Staff access management (2026-08-31) — closes a real gap: the only code
 * path anywhere that ever set role: "ADVISOR"/"ADMIN" was prisma/seed.ts,
 * so onboarding a new advisor meant someone with database access running
 * a script. ADMIN-only, stricter than every other per-resource gate in
 * /ops (src/lib/permissions.ts) — enforced both here (redirect) and in
 * every server action (defense in depth, same as every other ops page's
 * requireStaff() pattern).
 */
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ teamError?: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/ops");

  const { teamError } = await searchParams;
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADVISOR", "ADMIN", "LEAD_MANAGER", "CONTENT_EDITOR", "ANALYST"] } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">کارکنان</h1>
      <p className="mt-1 text-sm text-secondary">دسترسی مشاوران و ادمین‌ها را از همین‌جا مدیریت کن — دادن دسترسی، گرفتن دسترسی، تغییر نقش، ریست رمز عبور یا احراز هویت دومرحله‌ای.</p>

      {teamError && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {TEAM_ERROR_LABEL[teamError] ?? "مشکلی پیش آمد."}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-border bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-purple-900">
          <UserPlus size={17} weight="bold" />
          افزودن عضو جدید
        </h2>
        <form action={createStaffAccount} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            name="name"
            placeholder="نام و نام خانوادگی"
            required
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
          {/* No font-latin (found 2026-08-31) — the placeholder itself is
              Farsi ("ایمیل"); forcing Inter here dropped it to the
              browser's own fallback font instead of the site's, since
              Inter has no Farsi glyphs. What's actually typed is Latin
              either way, and IRANSansX renders that fine. */}
          <input
            name="email"
            type="email"
            placeholder="ایمیل"
            required
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
          <select
            name="role"
            defaultValue="ADVISOR"
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          >
            <option value="ADVISOR">{ROLE_FA.ADVISOR}</option>
            <option value="LEAD_MANAGER">{ROLE_FA.LEAD_MANAGER}</option>
            <option value="CONTENT_EDITOR">{ROLE_FA.CONTENT_EDITOR}</option>
            <option value="ANALYST">{ROLE_FA.ANALYST}</option>
            <option value="ADMIN">{ROLE_FA.ADMIN}</option>
          </select>
          {/* No font-latin — same reason as the email field above. */}
          <input
            name="password"
            type="password"
            placeholder="رمز عبور موقت (حداقل ۸ کاراکتر)"
            required
            minLength={8}
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="تکرار رمز عبور"
            required
            minLength={8}
            className="rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
          <button
            type="submit"
            className="press w-fit rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900 sm:col-span-2 lg:col-span-5"
          >
            افزودن
          </button>
        </form>
        <p className="mt-3 text-xs text-secondary">
          چون این پروژه هنوز سرویس ایمیل ندارد، دعوت‌نامه‌ای ارسال نمی‌شود — رمز عبور موقت را خودت مستقیماً به فرد جدید بده؛ او می‌تواند بعداً از پروفایل خودش تغییرش دهد.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-start text-xs text-secondary">
              <th className="px-4 py-3 text-start font-medium">نام</th>
              <th className="px-4 py-3 text-start font-medium">ایمیل</th>
              <th className="px-4 py-3 text-start font-medium">نقش</th>
              <th className="px-4 py-3 text-start font-medium">وضعیت</th>
              <th className="px-4 py-3 text-start font-medium">۲FA</th>
              <th className="px-4 py-3 text-start font-medium">عضویت</th>
              <th className="px-4 py-3 text-start font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const isSelf = member.id === session.user.id;
              return (
                <tr key={member.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 font-medium text-purple-900">{member.name}</td>
                  <td className="font-latin px-4 py-3 text-xs text-secondary">{member.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={member.role === "ADMIN" ? "purple" : "neutral"}>{ROLE_FA[member.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={member.active ? "success" : "danger"}>{member.active ? "فعال" : "غیرفعال"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={member.mfaEnabled ? "success" : "neutral"}>{member.mfaEnabled ? "فعال" : "غیرفعال"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-secondary">{member.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}</td>
                  <td className="px-4 py-3">
                    {isSelf ? (
                      <span className="text-xs text-secondary">همین حساب توئه</span>
                    ) : (
                      <div className="flex flex-col items-start gap-2">
                        <form action={changeRole} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={member.id} />
                          <select
                            name="role"
                            defaultValue={member.role}
                            className="rounded-md border border-border-strong bg-white px-2 py-1 text-xs text-purple-900 outline-none focus:border-purple-600"
                          >
                            <option value="ADVISOR">{ROLE_FA.ADVISOR}</option>
                            <option value="LEAD_MANAGER">{ROLE_FA.LEAD_MANAGER}</option>
                            <option value="CONTENT_EDITOR">{ROLE_FA.CONTENT_EDITOR}</option>
                            <option value="ANALYST">{ROLE_FA.ANALYST}</option>
                            <option value="ADMIN">{ROLE_FA.ADMIN}</option>
                          </select>
                          <button type="submit" className="press text-xs font-medium text-secondary hover:text-purple-600">
                            تغییر نقش
                          </button>
                        </form>

                        {member.active ? (
                          <ConfirmDeleteForm
                            action={setAccessActive}
                            id={member.id}
                            hiddenFields={{ userId: member.id, active: "false" }}
                            message={`دسترسی ${member.name} گرفته شود؟ او دیگر نمی‌تواند وارد شود، اما تاریخچه‌اش (لیدها، فعالیت‌ها) حذف نمی‌شود.`}
                            className="press text-xs font-medium text-danger hover:underline"
                          >
                            گرفتن دسترسی
                          </ConfirmDeleteForm>
                        ) : (
                          <form action={setAccessActive}>
                            <input type="hidden" name="userId" value={member.id} />
                            <input type="hidden" name="active" value="true" />
                            <button type="submit" className="press text-xs font-medium text-success hover:underline">
                              بازگرداندن دسترسی
                            </button>
                          </form>
                        )}

                        {member.mfaEnabled && (
                          <form action={resetStaffMfa}>
                            <input type="hidden" name="userId" value={member.id} />
                            <button type="submit" className="press flex items-center gap-1 text-xs font-medium text-secondary hover:text-purple-600">
                              <ShieldWarning size={13} />
                              ریست ۲FA
                            </button>
                          </form>
                        )}

                        <AdminResetPasswordForm userId={member.id} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
