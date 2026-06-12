"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GUEST_TRIAL_NAV } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import type { TryBackTarget } from "../types/guest-try.types";

export type { TryBackTarget };

type TryBackButtonProps = {
  back: TryBackTarget;
  className?: string;
};

export function TryBackButton({ back, className }: TryBackButtonProps) {
  const label = (
    <>
      <ChevronLeft className="size-3.5 shrink-0" aria-hidden />
      {GUEST_TRIAL_NAV.goBack}
    </>
  );

  if ("href" in back) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className={cn("h-8 px-2 text-muted-foreground", className)}
      >
        <Link href={back.href}>{label}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-8 px-2 text-muted-foreground", className)}
      onClick={back.onClick}
    >
      {label}
    </Button>
  );
}
