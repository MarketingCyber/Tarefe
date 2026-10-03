"use client";

import { ErrorState } from "@/components/feedback/ErrorState";

export default function OpsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-20">
      <ErrorState title="Something went wrong loading this page" body="This is likely a transient error. Try again." retryLabel="Retry" onRetry={reset} />
    </div>
  );
}
