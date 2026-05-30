"use client";

import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProfileConnectionHandlers } from "@/features/user-profile/types/public-profile-actions.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";
import { PublicProfileStatusBanner } from "./status-banner";

type PublicProfilePendingOutgoingPanelProps = {
  connectionHandlers: PublicProfileConnectionHandlers;
  onWithdrawClick: () => void;
  overflow: PublicProfileOverflowMenuProps;
  className?: string;
};

export function PublicProfilePendingOutgoingPanel({
  connectionHandlers,
  onWithdrawClick,
  overflow,
  className,
}: PublicProfilePendingOutgoingPanelProps) {
  return (
    <PublicProfileStatusBanner
      tone="muted"
      icon={<Clock className="size-4" aria-hidden />}
      label="Connection request sent"
      className={className}
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
  );
}
