"use client";

import { CircleDashed } from "lucide-react";

type SpacesBrowseSectionEmptyProps = {
  message: string;
};

export function SpacesBrowseSectionEmpty({ message }: SpacesBrowseSectionEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/15 px-6 py-10 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-muted-foreground">
        <CircleDashed className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
  );
}
