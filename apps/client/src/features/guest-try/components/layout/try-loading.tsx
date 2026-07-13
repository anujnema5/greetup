"use client";

import { BrandSpinner } from "@/components/brand-spinner";

import { TryLayout } from "./try-layout";

type TryLoadingProps = {
  message: string;
};

export function TryLoading({ message }: TryLoadingProps) {
  return (
    <TryLayout showTagline={false}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <BrandSpinner label={message} />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </TryLayout>
  );
}
