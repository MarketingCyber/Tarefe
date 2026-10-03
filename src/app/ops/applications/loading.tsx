import { TableRowSkeleton } from "@/components/feedback/Skeleton";

export default function ApplicationsLoading() {
  return (
    <div className="container-page py-8">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-tint" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded-lg bg-tint" />
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} columns={6} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
