"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ProfileEditShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Bumble-style: full-width sheet on narrow viewports, centered dialog on desktop.
 */
export function ProfileEditShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ProfileEditShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "gap-0 p-0 overflow-hidden flex flex-col max-w-[100vw] w-full sm:max-w-lg",
          "fixed bottom-0 left-0 right-0 top-auto h-auto max-h-[min(92vh,880px)] translate-x-0 translate-y-0",
          "rounded-t-[1.75rem] border-b-0 shadow-2xl",
          "sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-h-[85vh] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-border"
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0 space-y-1 text-left">
          <DialogTitle className="text-[17px] font-semibold tracking-tight">{title}</DialogTitle>
          {description ? (
            <p className="text-[13px] text-muted-foreground font-normal leading-snug pr-8">
              {description}
            </p>
          ) : null}
        </DialogHeader>
        <ScrollArea className="max-h-[min(58vh,520px)] sm:max-h-[min(50vh,480px)]">
          <div className="px-5 py-4">{children}</div>
        </ScrollArea>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-background/95 backdrop-blur-sm px-5 py-4">
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
