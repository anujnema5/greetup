"use client";

import { Users } from "lucide-react";

import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { activeSpaceCardShowsLiveSession } from "@/features/spaces/lib/active-space-card-session-display";
import { formatScheduledStart } from "@/lib/datetime/format-scheduled-start";
import { EXPLORE } from "@/lib/copy/user-messages";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  space: ActiveSpaceItem;
  onJoin: (space: ActiveSpaceItem) => void;
  className?: string;
};

function hostLabel(host: ActiveSpaceItem["host"]) {
  return host.displayName?.trim() || host.name?.trim() || "Host";
}

export function ExploreNicheRoomRow({ space, onJoin, className }: Props) {
  const isLive = activeSpaceCardShowsLiveSession(space);
  const scheduledLabel = formatScheduledStart(space.scheduledStartAt);

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 px-3.5 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{space.title}</p>
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400">
              <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" aria-hidden />
              {EXPLORE.browseNiches.live}
            </span>
          ) : (
            <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {EXPLORE.browseNiches.scheduled}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {hostLabel(space.host)}
          {scheduledLabel && !isLive ? ` · ${scheduledLabel}` : null}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80">
          {space.status === "scheduled" ? (
            EXPLORE.browseNiches.seatsWhenScheduled(space.maxParticipants)
          ) : space.participantCount > 0 ? (
            <>
              <Users size={11} className="shrink-0" aria-hidden />
              {EXPLORE.browseNiches.seatsInRoom(space.participantCount, space.maxParticipants)}
            </>
          ) : (
            EXPLORE.browseNiches.noOneInRoomYet
          )}
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        className="shrink-0 rounded-xl cursor-pointer"
        onClick={() => onJoin(space)}
      >
        {EXPLORE.browseNiches.join}
      </Button>
    </li>
  );
}
