import Link from "next/link";
import { notFound } from "next/navigation";

const VALID_ROUTES = new Set(["dashboard", "leads", "customers", "applications", "contracts", "tasks", "calendar", "tickets", "conversations", "providers", "reports", "bi", "marketing"]);

export function generateStaticParams() {
  return [...VALID_ROUTES].map((path) => ({ path: [path] }));
}

export default async function OpsStubPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!VALID_ROUTES.has(path[0])) notFound();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-latin text-sm text-secondary">/ops/{path.join("/")}</p>
      <h1 className="text-xl font-bold text-purple-900">Under construction</h1>
      <p className="max-w-[42ch] text-sm text-secondary">Reserved for the CRM/operations phase, built on the backend once it ships.</p>
      <Link href="/ops" className="text-sm font-semibold text-purple-600">
        Back to Operations
      </Link>
    </div>
  );
}
