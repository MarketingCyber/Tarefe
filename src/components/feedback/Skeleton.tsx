/**
 * Loading placeholder matching the shape of what's loading — never a bare
 * spinner. Per Phase 2 §24: "Use skeleton states rather than blank screens."
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-tint ${className ?? ""}`} aria-hidden="true" />;
}

export function ServiceCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-5">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3.5 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}
