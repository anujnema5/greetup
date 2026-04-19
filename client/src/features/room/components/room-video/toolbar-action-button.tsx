"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToolbarActionButtonProps = {
  label: string;
  onClick: () => void;
  icon: ReactNode;
  variant: "secondary" | "danger";
  size: number;
};

export function ToolbarActionButton({
  label,
  onClick,
  icon,
  variant,
  size,
}: ToolbarActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1 active:opacity-90 md:min-h-0 md:min-w-0 md:gap-1.5"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl transition-all duration-200",
          variant === "danger"
            ? "bg-red-500 shadow-[0_8px_20px_rgba(239,68,68,0.35)] hover:bg-red-400"
            : "border border-border/80 bg-card/85 hover:bg-card dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15",
        )}
        style={{ width: size, height: size }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-medium text-muted-foreground md:text-[11px] dark:text-white/60">
        {label}
      </span>
    </button>
  );
}
