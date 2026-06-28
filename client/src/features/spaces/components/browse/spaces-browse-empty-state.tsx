"use client";

import { UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SPACES_BROWSE_EMPTY } from "../../constants/spaces-browse-copy";
import { SPACES_BROWSE_ON_PRIMARY } from "../../lib/spaces-browse-ui";
import { cn } from "@/lib/utils";

type SpacesBrowseEmptyStateProps = {
  onStartSpace: () => void;
};

export function SpacesBrowseEmptyState({ onStartSpace }: SpacesBrowseEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 px-6 py-14 text-center mt-2">
      <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground">
        <UsersRound className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="text-base font-semibold text-foreground">{SPACES_BROWSE_EMPTY.title}</p>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
        {SPACES_BROWSE_EMPTY.description}
      </p>
      <Button
        type="button"
        className={cn("mt-6 rounded-full gap-2", SPACES_BROWSE_ON_PRIMARY)}
        onClick={onStartSpace}
      >
        <UsersRound className="size-4" aria-hidden />
        {SPACES_BROWSE_EMPTY.cta}
      </Button>
    </div>
  );
}
