import Link from "next/link";
import { notFound } from "next/navigation";
import { Wrench } from "@phosphor-icons/react/dist/ssr";

const VALID_ROUTES = new Set([
  "dashboard",
  "contracts",
  "applications",
  "documents",
  "requests",
  "messages",
  "support",
  "notifications",
  "profile",
  "settings",
]);

export function generateStaticParams() {
  return [...VALID_ROUTES].map((path) => ({ path: [path] }));
}

/**
 * Placeholder for every reserved My Tarefe portal route. Real screens land
 * once the backend/auth/database phase ships — this keeps the URL
 * architecture real and reachable now without faking a working product.
 */
export default async function PortalStubPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!VALID_ROUTES.has(path[0])) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-600/10 text-purple-600">
        <Wrench size={26} weight="duotone" />
      </span>
      <p className="font-latin text-sm text-secondary">/app/{path.join("/")}</p>
      <h1 className="text-xl font-bold text-purple-900">این بخش در حال ساخت است</h1>
      <p className="max-w-[42ch] text-sm text-secondary">این مسیر بخشی از معماری My Tarefe است و پس از راه‌اندازی بک‌اند فعال می‌شود.</p>
      <Link href="/app" className="text-sm font-semibold text-purple-600">
        بازگشت به My Tarefe
      </Link>
    </div>
  );
}
