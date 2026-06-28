"use client";

import { Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScheduledStart } from "@/lib/datetime/format-scheduled-start";
import {
  activeCircleCardShowsLiveSession,
  activeCircleHostCanEditSchedule,
} from "@/features/circles/lib/active-circle-card-session-display";
import type { ActiveCircleItem } from "../types/circles-api.types";
import {
  HomeCircleCard,
  HomeCircleCardSkeleton,
  HomeCircleCardSkeletonGrid,
} from "./home-circle-card";

const COVERS = [
  "from-violet-600/80 via-violet-700/60 to-purple-900",
  "from-sky-500/80 via-blue-700/60 to-indigo-900",
  "from-amber-500/80 via-orange-600/60 to-orange-900",
  "from-emerald-500/80 via-teal-700/60 to-teal-900",
  "from-fuchsia-500/80 via-purple-700/60 to-purple-900",
  "from-rose-500/80 via-red-700/60 to-red-900",
  "from-cyan-500/80 via-sky-700/60 to-blue-900",
];

export function coverForCircle(id: string) {
  const n = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COVERS[n % COVERS.length];
}

function hostLabel(host: ActiveCircleItem["host"]) {
  return host.displayName?.trim() || host.name?.trim() || "Host";
}

export const FriendInvitedBadge = (
  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
    Invited
  </span>
);

export const JoinedCircleBadge = (
  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
    Joined
  </span>
);

export type ActiveCircleCardProps = {
  circle: ActiveCircleItem;
  badge?: React.ReactNode;
  currentUserId: string | null;
  onJoin: (circle: ActiveCircleItem) => void;
  onEditScheduled?: (circle: ActiveCircleItem) => void;
  onStartScheduledNow?: (circle: ActiveCircleItem) => void;
  startScheduledBusy?: boolean;
  className?: string;
};

export function ActiveCircleCard({
  circle,
  badge,
  currentUserId,
  onJoin,
  onEditScheduled,
  onStartScheduledNow,
  startScheduledBusy,
  className,
}: ActiveCircleCardProps) {
  const cover = coverForCircle(circle.id);
  const isLive = activeCircleCardShowsLiveSession(circle);
  const scheduledLabel = formatScheduledStart(circle.scheduledStartAt);
  const isHost = Boolean(currentUserId && circle.host.userId === currentUserId);
  const canEditSchedule = activeCircleHostCanEditSchedule(circle);
  const showEdit = isHost && canEditSchedule && onEditScheduled;
  const showStartNow =
    Boolean(onStartScheduledNow) && isHost && !isLive && canEditSchedule;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onJoin(circle)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onJoin(circle);
        }
      }}
      className={cn(
        "group relative h-44 w-full cursor-pointer overflow-hidden rounded-2xl border border-border/40 bg-linear-to-br p-0 text-left font-inherit outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/30",
        cover,
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 transition-colors duration-150 group-hover:ring-white/15 pointer-events-none" />

      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-2 py-0.5">
        {isLive ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[9px] font-bold text-white tracking-widest">LIVE</span>
          </>
        ) : (
          <span className="text-[9px] font-bold text-white/80 tracking-widest">
            {circle.scheduledStartAt ? "SCHEDULED" : "SOON"}
          </span>
        )}
      </div>

      {showEdit ? (
        <button
          type="button"
          className="absolute top-2 right-2 z-10 cursor-pointer rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md hover:bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            onEditScheduled?.(circle);
          }}
        >
          Edit
        </button>
      ) : badge ? (
        <div className="absolute top-1 right-2.5">{badge}</div>
      ) : (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-1.5 py-0.5">
          <Users size={9} className="text-white/70" />
          <span className="text-[10px] text-white font-semibold">
            {circle.participantCount}/{circle.maxParticipants}
          </span>
        </div>
      )}

      {showEdit && (
        <div className="absolute top-9 right-2.5 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-1.5 py-0.5">
          <Users size={9} className="text-white/70" />
          <span className="text-[10px] text-white font-semibold">
            {circle.participantCount}/{circle.maxParticipants}
          </span>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 pb-3">
        <p className="text-[10px] text-white/60 mb-0.5">
          {circle.category.emoji} {circle.category.displayName}
        </p>
        <p className="text-xs font-bold text-white leading-snug drop-shadow-sm line-clamp-2">
          {circle.title}
        </p>
        {isLive ? (
          <p className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-white/85">
            <Video className="size-3 shrink-0 text-white/90" aria-hidden />
            <span>Ongoing circle</span>
          </p>
        ) : scheduledLabel ? (
          <p className="mt-0.5 text-[10px] text-white/70">Starts {scheduledLabel}</p>
        ) : null}
        <p className="text-[10px] text-white/50 mt-0.5">by {hostLabel(circle.host)}</p>
        {isHost ? (
          <p className="text-[9px] font-semibold text-white/75 mt-0.5">You are hosting</p>
        ) : null}
        {showStartNow && onStartScheduledNow ? (
          <button
            type="button"
            disabled={startScheduledBusy}
            className="relative z-20 mt-2 w-full cursor-pointer rounded-lg bg-primary py-1.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 pointer-events-auto disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 dark:!text-primary-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onStartScheduledNow(circle);
            }}
          >
            Start now
          </button>
        ) : null}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 pointer-events-none">
        <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-medium text-white">
          {isLive ? "Join" : "Open"}
        </span>
      </div>
    </div>
  );
}

export type ActiveCircleCardGridProps = {
  items: ActiveCircleItem[];
  renderBadge?: (item: ActiveCircleItem) => React.ReactNode;
  currentUserId: string | null;
  onJoinCircle: (circle: ActiveCircleItem) => void;
  onEditScheduled?: (circle: ActiveCircleItem) => void;
  onStartScheduledNow?: (circle: ActiveCircleItem) => void;
  startScheduledBusy?: boolean;
  className?: string;
};

/** Handlers shared by grid + browse (everything except `items` / `renderBadge` / `layout`). */
export type ActiveCircleCardGridHandlers = Omit<
  ActiveCircleCardGridProps,
  "items" | "renderBadge" | "className"
>;

export function ActiveCircleCardGrid({
  items,
  renderBadge,
  currentUserId,
  onJoinCircle,
  onEditScheduled,
  onStartScheduledNow,
  startScheduledBusy,
  className,
}: ActiveCircleCardGridProps) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(240px,280px))] gap-3",
        className,
      )}
    >
      {items.map((circle) => (
        <HomeCircleCard
          key={circle.id}
          circle={circle}
          badge={renderBadge?.(circle)}
          currentUserId={currentUserId}
          onJoinCircle={onJoinCircle}
          onEditScheduled={onEditScheduled}
          onStartScheduledNow={onStartScheduledNow}
          startScheduledBusy={startScheduledBusy}
        />
      ))}
    </div>
  );
}

export function ActiveCircleCardSkeleton() {
  return <HomeCircleCardSkeleton />;
}

export function ActiveCircleCardSkeletonGrid({
  count = 4,
}: {
  count?: number;
  layout?: "responsive" | "scroll";
}) {
  return <HomeCircleCardSkeletonGrid count={count} />;
}
