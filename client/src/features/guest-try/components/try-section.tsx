"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TrySectionProps = {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
};

export function TrySection({ label, children, className, hint }: TrySectionProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5",
        className,
      )}
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
      {hint ? <div className="mt-4">{hint}</div> : null}
    </section>
  );
}
