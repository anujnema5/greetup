"use client";

import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";

type TrySectionProps = {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
};

export function TrySection({ label, children, className, hint }: TrySectionProps) {
  const labelId = useId();

  return (
    <section
      aria-labelledby={labelId}
      className={cn(
        "rounded-xl border border-white/5 bg-white/[0.02] p-3.5 sm:p-4",
        className,
      )}
    >
      <p
        id={labelId}
        className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </p>
      {children}
      {hint ? <div className="mt-4">{hint}</div> : null}
    </section>
  );
}
