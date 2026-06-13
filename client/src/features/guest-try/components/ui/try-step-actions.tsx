"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TryStepActionsProps = {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
};

export function TryStepActions({ primary, secondary, className }: TryStepActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {secondary ? <div className="order-2 sm:order-1">{secondary}</div> : null}
      <div className={cn("order-1 sm:order-2", secondary ? "sm:ml-auto" : "")}>{primary}</div>
    </div>
  );
}
