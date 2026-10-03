import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret, generateTotpSecret, verifyTotpCode, totpQrCodeDataUrl } from "@/lib/mfa";
import { rateLimit, getClientIpFromHeaders } from "@/lib/rate-limit";
import { trackServer } from "@/lib/analytics-server";
import { EVENT } from "@/lib/analytics";
import { Button } from "@/components/shared/Button";

const ERROR_LABEL: Record<string, string> = {
  invalid_code: "کد درست نیست — اپلیکیشن Authenticator خود را چک کن و دوباره امتحان کن.",
  rate_limited: "تعداد تلاش‌ها زیاد بوده. یک دقیقه صبر کن و دوباره امتحان کن.",
};

/**
 * TOTP is a 6-digit code (1,000,000 combinations) valid for a short rolling
 * window — with no throttle at all, that's crackable within a single valid
 * window by sheer request volume, not the "12 days at a sane rate" a
 * naive per-minute calculation suggests. `authorize()` (src/lib/auth.ts)
 * already rate-limits the *login-time* TOTP check for exactly this
 * reason; these two actions verify a code too and had nothing. IP-only,
 * same as everywhere else this project rate-limits — 10/minute, not the
 * 60 login needed: nothing here is exercised by a parallel E2E run the
 * way login is (only mfa.spec.ts touches this, a handful of calls total).
 */
async function checkRateLimit() {
  const ip = getClientIpFromHeaders(await headers());
  return rateLimit(`mfa-verify:${ip}`, 10).allowed;
}

/**
 * Starts setup: generates a secret and stores it encrypted, but leaves
 * mfaEnabled false. That's a deliberately safe intermediate state — the
 * authorize() check in src/lib/auth.ts only enforces MFA when
 * `mfaEnabled && mfaSecret` are both true, so a secret sitting unconfirmed
 * here never locks anyone out of their own account before they've actually
 * verified they can generate codes with it.
 */
async function startSetup() {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: session.user.id }, data: { mfaSecret: encryptSecret(secret) } });
  revalidatePath("/ops/security");
}

async function cancelSetup() {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.user.update({ where: { id: session.user.id }, data: { mfaSecret: null, mfaEnabled: false } });
  revalidatePath("/ops/security");
}

async function confirmSetup(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await checkRateLimit())) redirect("/ops/security?error=rate_limited");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.mfaSecret) return;

  const code = (formData.get("code") as string)?.trim();
  const secret = decryptSecret(user.mfaSecret);
  if (!code || !(await verifyTotpCode(secret, code))) {
    redirect("/ops/security?error=invalid_code");
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { mfaEnabled: true } });
  await trackServer(EVENT.MFA_ENABLED, { userId: session.user.id });
  redirect("/ops/security?enabled=1");
}

async function disableMfa(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  if (!(await checkRateLimit())) redirect("/ops/security?error=rate_limited");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.mfaSecret) return;

  const code = (formData.get("code") as string)?.trim();
  const secret = decryptSecret(user.mfaSecret);
  if (!code || !(await verifyTotpCode(secret, code))) {
    redirect("/ops/security?error=invalid_code");
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { mfaSecret: null, mfaEnabled: false } });
  await trackServer(EVENT.MFA_DISABLED, { userId: session.user.id });
  redirect("/ops/security?disabled=1");
}

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; enabled?: string; disabled?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/security");

  const { error, enabled, disabled } = await searchParams;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="text-2xl font-bold text-purple-900">امنیت</h1>
      <p className="mt-1 text-sm text-secondary">احراز هویت دومرحله‌ای برای حساب‌های کارکنان (مشاور/ادمین).</p>

      {enabled && (
        <p role="status" className="mt-4 rounded-lg bg-success-bg px-3 py-2 text-xs font-medium text-success">
          احراز هویت دومرحله‌ای فعال شد. برای ورود بعدی به اپلیکیشن Authenticator خود نیاز داری.
        </p>
      )}
      {disabled && (
        <p role="status" className="mt-4 rounded-lg bg-tint px-3 py-2 text-xs font-medium text-secondary">
          احراز هویت دومرحله‌ای برای این حساب غیرفعال شد.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {ERROR_LABEL[error] ?? "مشکلی پیش آمد."}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        {user.mfaEnabled ? (
          <>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} weight="fill" className="text-success" />
              <h2 className="text-sm font-bold text-purple-900">احراز هویت دومرحله‌ای فعال است</h2>
            </div>
            <p className="mt-2 text-xs text-secondary">
              از این پس هر ورود، علاوه بر رمز عبور، به یک کد از اپلیکیشن Authenticator نیاز دارد. غیرفعال‌سازی هم به یک کد معتبر نیاز دارد — اگر دسترسی به
              Authenticator را از دست بدهی، باید از یک ادمین بخواهی مستقیماً در دیتابیس آن را ریست کند.
            </p>
            <form action={disableMfa} className="mt-4 grid max-w-xs gap-2">
              <label htmlFor="disable-code" className="text-xs font-semibold text-body">
                برای غیرفعال‌سازی، یک کد معتبر وارد کن
              </label>
              <input
                id="disable-code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="font-latin rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-center tracking-[0.3em] text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
              />
              <Button type="submit" variant="danger" size="md" className="w-fit">
                غیرفعال‌سازی احراز هویت دومرحله‌ای
              </Button>
            </form>
          </>
        ) : user.mfaSecret ? (
          <SetupInProgress secret={decryptSecret(user.mfaSecret)} email={user.email} confirmSetup={confirmSetup} cancelSetup={cancelSetup} />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <ShieldWarning size={20} className="text-secondary" />
              <h2 className="text-sm font-bold text-purple-900">احراز هویت دومرحله‌ای فعال نیست</h2>
            </div>
            <p className="mt-2 text-xs text-secondary">با هر اپلیکیشن TOTP Authenticator (Google Authenticator، 1Password، Authy و مشابه) یک مرحله دیگر به ورودت اضافه کن.</p>
            <form action={startSetup} className="mt-4">
              <Button type="submit" size="lg" className="w-fit">
                راه‌اندازی احراز هویت دومرحله‌ای
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

async function SetupInProgress({
  secret,
  email,
  confirmSetup,
  cancelSetup,
}: {
  secret: string;
  email: string;
  confirmSetup: (formData: FormData) => Promise<void>;
  cancelSetup: () => Promise<void>;
}) {
  const qrDataUrl = await totpQrCodeDataUrl(secret, email);

  return (
    <>
      <h2 className="text-sm font-bold text-purple-900">این کد QR را اسکن کن</h2>
      <p className="mt-2 text-xs text-secondary">با اپلیکیشن Authenticator اسکن کن، سپس کد ۶ رقمی نمایش‌داده‌شده را برای تایید راه‌اندازی وارد کن.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URL, not a remote image next/image would need to fetch/optimize */}
      <img src={qrDataUrl} alt="کد QR برای TOTP" width={200} height={200} className="mt-4 rounded-xl border border-border" />
      <p data-testid="mfa-secret" className="font-latin mt-3 break-all rounded-lg bg-tint px-3 py-2 text-xs text-secondary">{secret}</p>
      <p className="mt-1 text-xs text-secondary">نمی‌توانی اسکن کنی؟ این کلید را دستی در اپلیکیشنت وارد کن.</p>

      <form action={confirmSetup} className="mt-4 grid max-w-xs gap-2">
        <label htmlFor="confirm-code" className="text-xs font-semibold text-body">
          کد را برای تایید وارد کن
        </label>
        <input
          id="confirm-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          autoFocus
          className="font-latin rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-center tracking-[0.3em] text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" className="w-fit">
            تایید و فعال‌سازی
          </Button>
        </div>
      </form>
      <form action={cancelSetup} className="mt-2">
        <button type="submit" className="press text-xs font-medium text-secondary hover:text-purple-600">
          لغو راه‌اندازی
        </button>
      </form>
    </>
  );
}
