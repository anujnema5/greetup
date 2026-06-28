"use client";

import { ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScheduledStart } from "@/lib/datetime/format-scheduled-start";
import {
  activeSpaceCardShowsLiveSession,
  activeSpaceHostCanEditSchedule,
} from "@/features/spaces/lib/active-space-card-session-display";
import type { ActiveSpaceItem } from "../types/spaces-api.types";
import { SPACE_PREVIEW_GRID_CLASS } from "../lib/space-preview-grid-classes";

const COVER_CLASSES = [
  "dash-space-cover-0",
  "dash-space-cover-1",
  "dash-space-cover-2",
  "dash-space-cover-3",
] as const;

function coverClassForSpace(id: string) {
  const n = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COVER_CLASSES[n % COVER_CLASSES.length];
}

function hostInitial(host: ActiveSpaceItem["host"]) {
  const name = host.displayName?.trim() || host.name?.trim() || "H";
  return name.charAt(0).toUpperCase();
}

export type HomeSpaceCardProps = {
  space: ActiveSpaceItem;
  badge?: React.ReactNode;
  currentUserId: string | null;
  onJoinSpace: (space: ActiveSpaceItem) => void;
  onEditScheduled?: (space: ActiveSpaceItem) => void;
  onStartScheduledNow?: (space: ActiveSpaceItem) => void;
  startScheduledBusy?: boolean;
  className?: string;
};

export function HomeSpaceCard({
  space,
  badge,
  currentUserId,
  onJoinSpace,
  onEditScheduled,
  onStartScheduledNow,
  startScheduledBusy,
  className,
}: HomeSpaceCardProps) {
  const isLive = activeSpaceCardShowsLiveSession(space);
  const scheduledLabel = formatScheduledStart(space.scheduledStartAt);
  const isHost = Boolean(currentUserId && space.host.userId === currentUserId);
  const canEditSchedule = activeSpaceHostCanEditSchedule(space);
  const showEdit = isHost && canEditSchedule && onEditScheduled;
  const showStartNow =
    Boolean(onStartScheduledNow) && isHost && !isLive && canEditSchedule;
  const extraCount = Math.max(0, space.participantCount - 1);
  const meta = isLive
    ? `${space.category.displayName} · live now`
    : scheduledLabel
      ? scheduledLabel
      : space.category.displayName;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onJoinSpace(space)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onJoinSpace(space);
        }
      }}
      className={cn(
        "group flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition-colors duration-150",
        "hover:border-border hover:bg-muted/20",
        className,
      )}
    >
      <div className={cn("relative h-[84px] shrink-0", coverClassForSpace(space.id))}>
        <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent dark:from-black/25" />

        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium leading-none text-foreground">
              <span className="dash-live-dot size-1.5 rounded-full bg-destructive" aria-hidden />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-card px-2 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
              {space.scheduledStartAt ? "Scheduled" : "Starting soon"}
            </span>
          )}

          <div className="flex shrink-0 items-center gap-1.5">
            {badge}
            {showEdit ? (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium leading-none text-foreground hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditScheduled?.(space);
                }}
              >
                Edit
              </button>
            ) : null}
          </div>
        </div>

        <span className="absolute bottom-3 left-3 text-2xl leading-none" aria-hidden>
          {space.category.emoji}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {space.title}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {space.scheduledStartAt && !isLive ? `Starts ${meta}` : meta}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {hostInitial(space.host)}
            </span>
            {extraCount > 0 ? (
              <span className="-ml-2 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                +{extraCount}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users size={11} aria-hidden />
              {space.participantCount}
            </span>
          </div>

          {showStartNow && onStartScheduledNow ? (
            <button
              type="button"
              disabled={startScheduledBusy}
              className="shrink-0 cursor-pointer rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                onStartScheduledNow(space);
              }}
            >
              Start now
            </button>
          ) : (
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80">
              Open
              <ChevronRight className="size-3.5" aria-hidden />
            </span>
          )}
        </div>

        {isHost ? (
          <p className="-mt-1 text-[10px] font-medium text-muted-foreground">You&apos;re hosting</p>
        ) : null}
      </div>
    </article>
  );
}

export function HomeSpaceCardSkeleton() {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-[88px] animate-pulse bg-muted/60" />
      <div className="space-y-3 p-3.5">
        <div className="space-y-2">
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-7 w-14 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

export function HomeSpaceCardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={SPACE_PREVIEW_GRID_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <HomeSpaceCardSkeleton key={i} />
      ))}
    </div>
  );
}
