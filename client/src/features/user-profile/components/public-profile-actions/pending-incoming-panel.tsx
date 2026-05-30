"use client";

import { Clock, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProfileConnectionHandlers } from "@/features/user-profile/types/public-profile-actions.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";
import { PublicProfileStatusBanner } from "./status-banner";

type PublicProfilePendingIncomingPanelProps = {
  connectionHandlers: PublicProfileConnectionHandlers;
  overflow: PublicProfileOverflowMenuProps;
  className?: string;
};

export function PublicProfilePendingIncomingPanel({
  connectionHandlers,
  overflow,
  className,
}: PublicProfilePendingIncomingPanelProps) {
  const busy =
    connectionHandlers.isSubmittingAccept || connectionHandlers.isSubmittingReject;

  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)}>
      <PublicProfileStatusBanner
        tone="amber"
        icon={<Clock className="size-4" aria-hidden />}
        label="Wants to connect with you"
        trailing={<PublicProfileOverflowMenu {...overflow} />}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 rounded-xl font-semibold"
          disabled={busy}
          onClick={connectionHandlers.onReject}
        >
          Decline
        </Button>
        <Button
          type="button"
          className="h-11 flex-1 rounded-xl font-semibold"
          disabled={busy}
          onClick={connectionHandlers.onAccept}
        >
          <UserCheck className="size-4" aria-hidden />
          {connectionHandlers.isSubmittingAccept ? "Accepting…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}
