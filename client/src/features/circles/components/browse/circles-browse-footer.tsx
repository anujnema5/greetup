"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CIRCLES_BROWSE_PAGE } from "../../constants/circles-browse-copy";

type CirclesBrowseFooterProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function CirclesBrowseFooter({ isRefreshing, onRefresh }: CirclesBrowseFooterProps) {
  return (
    <footer className="flex flex-col items-center gap-2 border-t border-border/50 pt-6">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full gap-2 border-border/80 bg-card/50 hover:bg-muted/50"
        disabled={isRefreshing}
        onClick={onRefresh}
      >
        <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} aria-hidden />
        {isRefreshing ? CIRCLES_BROWSE_PAGE.refreshing : CIRCLES_BROWSE_PAGE.refresh}
      </Button>
    </footer>
  );
}
