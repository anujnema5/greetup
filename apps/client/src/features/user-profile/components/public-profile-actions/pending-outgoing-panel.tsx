"use client";

import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProfileConnectionHandlers } from "@/features/user-profile/types/public-profile-actions.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";
import { PublicProfileStatusBanner } from "./status-banner";
import { PublicProfileMessageButton } from "./message-button";

type PublicProfilePendingOutgoingPanelProps = {
  connectionHandlers: PublicProfileConnectionHandlers;
  onWithdrawClick: () => void;
  onMessage: () => void;
  isOpeningChat?: boolean;
  overflow: PublicProfileOverflowMenuProps;
  className?: string;
};

export function PublicProfilePendingOutgoingPanel({
  connectionHandlers,
  onWithdrawClick,
  onMessage,
  isOpeningChat = false,
  overflow,
  className,
}: PublicProfilePendingOutgoingPanelProps) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)}>
      <PublicProfileStatusBanner
        tone="muted"
        icon={<Clock className="size-4" aria-hidden />}
        label="Connection request sent"
        trailing={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg shrink-0"
              disabled={connectionHandlers.isSubmittingWithdraw}
              onClick={onWithdrawClick}
            >
              {connectionHandlers.isSubmittingWithdraw ? "Withdrawing…" : "Withdraw"}
            </Button>
            <PublicProfileOverflowMenu {...overflow} />
          </>
        }
      />
      <PublicProfileMessageButton
        onClick={onMessage}
        isOpeningChat={isOpeningChat}
        className="w-full"
      />
    </div>
  );
}
