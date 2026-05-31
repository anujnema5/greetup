"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PublicProfileConnectionHandlers } from "@/features/user-profile/types/public-profile-actions.types";

import { PublicProfileOverflowMenu, type PublicProfileOverflowMenuProps } from "./overflow-menu";

type PublicProfileConnectPanelProps = {
  connectionHandlers: PublicProfileConnectionHandlers;
  overflow: PublicProfileOverflowMenuProps;
  className?: string;
};

export function PublicProfileConnectPanel({
  connectionHandlers,
  overflow,
  className,
}: PublicProfileConnectPanelProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        type="button"
        className="h-11 flex-1 rounded-xl font-semibold"
        disabled={connectionHandlers.isSubmittingConnect}
        onClick={connectionHandlers.onConnect}
      >
        <UserPlus className="size-4" aria-hidden />
        {connectionHandlers.isSubmittingConnect ? "Sending…" : "Connect"}
      </Button>
      <PublicProfileOverflowMenu {...overflow} tone="row" />
    </div>
  );
}
