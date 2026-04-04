"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MediaToggleButtonProps = {
  active: boolean;
  labelActive: string;
  labelInactive: string;
  onClick: () => void;
  disabled: boolean;
  iconActive: ReactNode;
  iconInactive: ReactNode;
};

const BTN_SIZE = 52;

export function MediaToggleButton({
  active,
  labelActive,
  labelInactive,
  onClick,
  disabled,
  iconActive,
  iconInactive,
}: MediaToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={active ? labelActive : labelInactive}
      title={active ? labelActive : labelInactive}
      className={cn(
        "group flex min-h-[44px] min-w-[44px] cursor-pointer flex-col items-center justify-center gap-1 active:opacity-90 md:min-h-0 md:min-w-0 md:gap-1.5",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border transition-colors duration-200",
          active
            ? "border-border bg-muted/60 dark:border-white/15 dark:bg-white/5"
            : "border-amber-500/35 bg-amber-950/40 dark:border-amber-400/30",
        )}
        style={{ width: BTN_SIZE, height: BTN_SIZE - 4 }}
      >
        {active ? iconActive : iconInactive}
      </div>
      <span className="max-w-[4.5rem] text-center text-[9px] text-muted-foreground md:max-w-none md:text-[10px] dark:text-white/45">
        {active ? labelActive : labelInactive}
      </span>
    </button>
  );
}
