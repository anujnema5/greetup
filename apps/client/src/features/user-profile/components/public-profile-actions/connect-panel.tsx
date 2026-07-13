"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProfileConnectionHandlers } from "@/features/user-profile/types/public-profile-actions.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";
import { PublicProfileMessageButton } from "./message-button";

type PublicProfileConnectPanelProps = {
  connectionHandlers: PublicProfileConnectionHandlers;
  onMessage: () => void;
  isOpeningChat?: boolean;
  overflow: PublicProfileOverflowMenuProps;
  className?: string;
};

export function PublicProfileConnectPanel({
  connectionHandlers,
  onMessage,
  isOpeningChat = false,
  overflow,
  className,
}: PublicProfileConnectPanelProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        type="button"
        className="h-11 min-w-0 flex-1 rounded-xl font-semibold"
        disabled={connectionHandlers.isSubmittingConnect}
        onClick={connectionHandlers.onConnect}
      >
        <UserPlus className="size-4" aria-hidden />
        {connectionHandlers.isSubmittingConnect ? "Sending…" : "Connect"}
      </Button>
      <PublicProfileMessageButton onClick={onMessage} isOpeningChat={isOpeningChat} />
      <PublicProfileOverflowMenu {...overflow} tone="row" />
    </div>
  );
}
