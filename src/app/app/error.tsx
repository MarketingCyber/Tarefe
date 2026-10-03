"use client";

import { ErrorState } from "@/components/feedback/ErrorState";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div dir="rtl" className="container-page py-20">
      <ErrorState title="مشکلی در بارگذاری این صفحه پیش آمد" body="این یک خطای موقت است. لطفا دوباره تلاش کنید." retryLabel="تلاش مجدد" onRetry={reset} />
    </div>
  );
}
