"use client";

import { TryLayout } from "./try-layout";

type TryLoadingProps = {
  message: string;
};

export function TryLoading({ message }: TryLoadingProps) {
  return (
    <TryLayout>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-4 py-16"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="relative" aria-hidden="true">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">G</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </TryLayout>
  );
}
