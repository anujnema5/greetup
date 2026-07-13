"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type ProfileSectionRowProps = {
  icon?: ReactNode;
  label: string;
  summary: string;
  onClick: () => void;
  className?: string;
};

export function ProfileSectionRow({
  icon,
  label,
  summary,
  onClick,
  className,
}: ProfileSectionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors",
        "hover:bg-muted/60 active:bg-muted/80 cursor-pointer",
        className
      )}
    >
      {icon ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground leading-snug">{summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
    </button>
  );
}
