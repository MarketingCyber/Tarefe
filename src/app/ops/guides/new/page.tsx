import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { createGuide } from "@/lib/guide-actions";
import { GuideForm } from "@/components/crm/GuideForm";
import { canAccessContent } from "@/lib/permissions";

export default async function NewGuidePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { error } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-8">
      <Link href="/ops/guides" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به راهنماها
      </Link>
      <h1 className="text-2xl font-bold text-purple-900">راهنمای جدید</h1>
      <div className="mt-6">
        <GuideForm action={createGuide} error={error} submitLabel="ایجاد" />
      </div>
    </div>
  );
}
