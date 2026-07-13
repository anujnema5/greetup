"use client";

import { useState } from "react";
import { Ban, MoreVertical, UserMinus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  COMPACT_DIALOG_DESCRIPTION,
  COMPACT_DIALOG_TITLE,
} from "@/lib/ui/compact-dialog-typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IN_CALL_DROPDOWN_Z } from "@/features/room/constants/call/in-call-dialog-layer";
import type { ParticipantRemoveTarget } from "@/features/room/types/call/participant-remove.types";
import { cn } from "@/lib/utils";

export type { ParticipantRemoveTarget } from "@/features/room/types/call/participant-remove.types";

type ParticipantKickMenuButtonProps = {
  participantLabel: string;
  disabled?: boolean;
  onRequestRemove: () => void;
  onRequestRestrict: () => void;
  variant?: "roster" | "tile";
  /** Inside {@link ParticipantTileControlsBar} — no extra border/background. */
  embedded?: boolean;
  className?: string;
};

export function ParticipantKickMenuButton({
  participantLabel,
  disabled = false,
  onRequestRemove,
  onRequestRestrict,
  variant = "roster",
  embedded = false,
  className,
}: ParticipantKickMenuButtonProps) {
  const isTile = variant === "tile";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Actions for ${participantLabel}`}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
            disabled && "cursor-not-allowed opacity-50",
            isTile && !embedded && "size-7 rounded-md border border-white/15 bg-black/60 text-white shadow-sm backdrop-blur-sm hover:bg-black/75",
            isTile && embedded && "size-6 rounded-[5px] text-white/80 hover:bg-white/10",
            !isTile && "size-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            className,
          )}
        >
          <MoreVertical
            className={cn("shrink-0", isTile ? "size-3.5" : "size-4")}
            strokeWidth={2.25}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={isTile ? "top" : "bottom"}
        sideOffset={6}
        collisionPadding={12}
        className={cn(IN_CALL_DROPDOWN_Z, "w-44 text-xs")}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onSelect={onRequestRemove}>
          <UserMinus className="size-3.5 shrink-0" strokeWidth={2.25} />
          Remove from space
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onRequestRestrict}>
          <Ban className="size-3.5 shrink-0" strokeWidth={2.25} />
          Remove and restrict
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ParticipantRemoveConfirmDialogProps = {
  target: ParticipantRemoveTarget | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (target: ParticipantRemoveTarget) => void;
  removing?: boolean;
};

export function ParticipantRemoveConfirmDialog({
  target,
  onOpenChange,
  onConfirm,
  removing = false,
}: ParticipantRemoveConfirmDialogProps) {
  const restrict = target?.restrict ?? false;

  return (
    <AlertDialog open={target != null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {restrict ? "Remove and restrict?" : "Remove from space?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {target
              ? restrict
                ? `${target.displayName} will leave now and won't be able to rejoin this space.`
                : `${target.displayName} will leave this space immediately.`
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className={buttonVariants({ variant: "destructive" })}
            disabled={!target || removing}
            onClick={() => {
              if (!target) return;
              onConfirm(target);
            }}
          >
            {restrict ? "Remove and restrict" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** @deprecated Use ParticipantRemoveConfirmDialog */
export const ParticipantKickConfirmDialog = ParticipantRemoveConfirmDialog;

