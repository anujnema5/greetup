"use client";

import { cn } from "@/lib/utils";

type ExploreSectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export function ExploreSectionHeader({ title, subtitle, className }: ExploreSectionHeaderProps) {
  return (
    <header className={cn("mb-4 space-y-1", className)}>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      {subtitle ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
