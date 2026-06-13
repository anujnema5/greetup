"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TryContinueButtonProps = ComponentProps<typeof Button> & {
  /** Keep full width on all breakpoints (gate screens). Default shrinks on sm+ for wizard footers. */
  fullWidth?: boolean;
};

export function TryContinueButton({
  className,
  size = "default",
  fullWidth = false,
  ...props
}: TryContinueButtonProps) {
  return (
    <Button
      size={size}
      className={cn(fullWidth ? "w-full" : "w-full sm:w-auto sm:min-w-[8.5rem]", className)}
      {...props}
    />
  );
}
