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
      className="group flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1.5 active:opacity-90 md:min-h-0 md:min-w-0 md:gap-2"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl transition-all duration-200",
          variant === "danger"
            ? "bg-red-500 hover:bg-red-400"
            : "border border-border bg-muted/60 hover:bg-muted dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
        )}
        style={{ width: size, height: size - 4 }}
      >
        {icon}
      </div>
      <span className="text-[9px] text-muted-foreground md:text-[10px] dark:text-white/45">{label}</span>
    </button>
  );
}
