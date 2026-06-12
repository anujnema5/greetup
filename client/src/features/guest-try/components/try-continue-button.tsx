"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TryContinueButtonProps = ComponentProps<typeof Button>;

export function TryContinueButton({ className, size = "default", ...props }: TryContinueButtonProps) {
  return (
    <Button
      size={size}
      className={cn("w-full sm:w-auto sm:min-w-[8.5rem]", className)}
      {...props}
    />
  );
}
