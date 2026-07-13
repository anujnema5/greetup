"use client";

import type { ReactNode } from "react";

import {
  FormSheet,
  FormSheetDescription,
  FormSheetFooter,
  FormSheetHeader,
  FormSheetTitle,
} from "@/components/ui/form-sheet";
import { cn } from "@/lib/utils";

type ProfileEditShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Profile section editor — FormSheet (drawer on mobile, dialog on desktop). */
export function ProfileEditShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ProfileEditShellProps) {
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton
      contentClassName="sm:max-w-lg"
    >
      <FormSheetHeader className="shrink-0 space-y-1.5 border-b border-border px-5 pt-5 pb-3 text-left">
        <FormSheetTitle className="text-base font-semibold tracking-tight text-foreground sm:text-[17px]">
          {title}
        </FormSheetTitle>
        {description ? (
          <FormSheetDescription className="pr-8 text-[13px] leading-snug text-muted-foreground">
            {description}
          </FormSheetDescription>
        ) : null}
      </FormSheetHeader>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4",
          "[-webkit-overflow-scrolling:touch] touch-pan-y",
        )}
      >
        {children}
      </div>

      {footer ? (
        <FormSheetFooter className="shrink-0 border-t border-border bg-background/95 px-5 py-4 backdrop-blur-sm">
          {footer}
        </FormSheetFooter>
      ) : null}
    </FormSheet>
  );
}
