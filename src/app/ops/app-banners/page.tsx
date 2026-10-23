import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessContent } from "@/lib/permissions";
import { UploadValidationError, deleteBannerImage, saveBannerImage } from "@/lib/document-storage";
import { Button } from "@/components/shared/Button";

/**
 * Staff manage the app's Home slider (owner, 2026-10-23): image or GIF, title, short text, one button and where
 * it leads. Shown to customers under their summary, in this order, max 5 at a time.
 */
const TARGETS = [
  { value: "offers", label: "تب پیشنهادها" },
  { value: "referral", label: "معرفی دوستان (پروفایل)" },
  { value: "support", label: "پشتیبانی" },
  { value: "advice:", label: "مشاوره برای یک خدمت (نام خدمت را بنویسید)" },
];

async function requireEditor() {
  const session = await auth();
  if (!session?.user?.id || !canAccessContent(session.user.role)) return null;
  return session.user;
}

async function createBanner(formData: FormData) {
  "use server";
  if (!(await requireEditor())) return;
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) return;
  let target = String(formData.get("target") ?? "offers");
  if (target === "advice:") target = `advice:${String(formData.get("service") ?? "").trim().slice(0, 60)}`;
  const file = formData.get("image");
  let imagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      imagePath = await saveBannerImage(file);
    } catch (error) {
      if (error instanceof UploadValidationError) return;
      throw error;
    }
  }
  const count = await prisma.appBanner.count();
  await prisma.appBanner.create({
    data: {
      title,
      body: String(formData.get("body") ?? "").trim().slice(0, 160) || null,
      ctaLabel: String(formData.get("ctaLabel") ?? "").trim().slice(0, 30) || null,
      target,
      imagePath,
      locale: (["fa", "de", "ru"].includes(String(formData.get("locale"))) ? String(formData.get("locale")) : "fa") as "fa" | "de" | "ru",
      sort: count,
    },
  });
  revalidatePath("/ops/app-banners");
}

async function toggleBanner(formData: FormData) {
  "use server";
  if (!(await requireEditor())) return;
  const id = String(formData.get("id"));
  const banner = await prisma.appBanner.findUnique({ where: { id } });
  if (banner) await prisma.appBanner.update({ where: { id }, data: { active: !banner.active } });
  revalidatePath("/ops/app-banners");
}

async function moveBanner(formData: FormData) {
  "use server";
  if (!(await requireEditor())) return;
  const id = String(formData.get("id"));
  const dir = Number(formData.get("dir"));
  const all = await prisma.appBanner.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });
  const i = all.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await prisma.$transaction(all.map((b, k) => prisma.appBanner.update({ where: { id: b.id }, data: { sort: k } })));
  revalidatePath("/ops/app-banners");
}

async function deleteBanner(formData: FormData) {
  "use server";
  if (!(await requireEditor())) return;
  const id = String(formData.get("id"));
  const banner = await prisma.appBanner.findUnique({ where: { id } });
  if (!banner) return;
  await prisma.appBanner.delete({ where: { id } });
  if (banner.imagePath) await deleteBannerImage(banner.imagePath);
  revalidatePath("/ops/app-banners");
}

const input = "w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";

export default async function AppBannersPage() {
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");
  const banners = await prisma.appBanner.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">اسلایدر اپ</h1>
      <p className="mt-1 text-sm text-secondary">اسلایدهای صفحه خانه اپ، زیر خلاصه مشتری. حداکثر ۵ اسلاید فعال برای هر زبان نمایش داده می‌شود.</p>

      <div className="mt-6 grid gap-6 2xl:grid-cols-3">
        <form action={createBanner} className="space-y-3 rounded-2xl border border-border bg-white p-6 text-sm 2xl:col-span-1">
          <h2 className="font-bold text-purple-900">اسلاید جدید</h2>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">عنوان</span>
            <input name="title" required maxLength={80} className={input} placeholder="دوستت را معرفی کن، ۱۰ یورو هدیه" />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">متن کوتاه (اختیاری)</span>
            <input name="body" maxLength={160} className={input} />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">متن دکمه (اختیاری)</span>
            <input name="ctaLabel" maxLength={30} className={input} placeholder="جزئیات" />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">دکمه به کجا برود</span>
            <select name="target" className={input} defaultValue="offers">
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">نام خدمت (فقط برای «مشاوره برای یک خدمت»)</span>
            <input name="service" maxLength={60} className={input} placeholder="بیمه دندان" />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">زبان</span>
            <select name="locale" className={input} defaultValue="fa">
              <option value="fa">فارسی</option>
              <option value="de">Deutsch</option>
              <option value="ru">Русский</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-purple-900">تصویر یا GIF (اختیاری، تا ۵ مگابایت، نسبت حدود ۲ به ۱)</span>
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="block w-full text-sm" />
          </label>
          <Button type="submit">افزودن اسلاید</Button>
        </form>

        <div className="space-y-3 2xl:col-span-2">
          {banners.length === 0 && <p className="rounded-2xl border border-border bg-white p-6 text-sm text-secondary">هنوز اسلایدی نیست.</p>}
          {banners.map((b, i) => (
            <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-white p-4 text-sm">
              {b.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element -- served by our own API, may be a GIF
                <img src={`/api/v1/banners/${b.id}/image?v=${b.updatedAt.getTime()}`} alt="" className="h-16 w-32 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-32 rounded-lg bg-tint" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-purple-900">{b.title}</p>
                <p className="text-secondary">
                  {b.body ?? ""} · <span className="font-latin">{b.target}</span> · {b.locale} {b.active ? "" : "· غیرفعال"}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={moveBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="dir" value="-1" />
                  <button type="submit" disabled={i === 0} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40" aria-label="بالاتر">↑</button>
                </form>
                <form action={moveBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="dir" value="1" />
                  <button type="submit" disabled={i === banners.length - 1} className="rounded-lg border border-border px-2 py-1 disabled:opacity-40" aria-label="پایین‌تر">↓</button>
                </form>
                <form action={toggleBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="rounded-lg border border-border px-3 py-1 font-medium text-purple-900">{b.active ? "غیرفعال کن" : "فعال کن"}</button>
                </form>
                <form action={deleteBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="rounded-lg border border-border px-3 py-1 font-medium text-danger">حذف</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
