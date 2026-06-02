"use client";

import { Users, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScheduledStart } from "@/lib/datetime/format-scheduled-start";
import {
  activeCircleCardShowsLiveSession,
  activeCircleHostCanEditSchedule,
} from "@/features/circles/lib/active-circle-card-session-display";
import type { ActiveCircleItem } from "../types/circles-api.types";

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
  <span className="text-[10px] font-bold text-black/80 bg-primary/80 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
    Invited
  </span>
);

export const JoinedCircleBadge = (
  <span className="text-[9px] tracking-wide font-bold text-white bg-black/45 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
    Joined
  </span>
);

export type ActiveCircleCardProps = {
  circle: ActiveCircleItem;
  badge?: React.ReactNode;
  currentUserId: string | null;
  onJoin: (circle: ActiveCircleItem) => void;
  onEditScheduled?: (circle: ActiveCircleItem) => void;
  className?: string;
};

export function ActiveCircleCard({
  circle,
  badge,
  currentUserId,
  onJoin,
  onEditScheduled,
  className,
}: ActiveCircleCardProps) {
  const cover = coverForCircle(circle.id);
  const isLive = activeCircleCardShowsLiveSession(circle);
  const scheduledLabel = formatScheduledStart(circle.scheduledStartAt);
  const isHost = Boolean(currentUserId && circle.host.userId === currentUserId);
  const canEditSchedule = activeCircleHostCanEditSchedule(circle);
  const showEdit = isHost && canEditSchedule && onEditScheduled;

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
        "group relative h-44 w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-linear-to-br text-left border-0 p-0 font-inherit outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        cover,
        className,
      )}
      style={{ boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset, 0 4px 20px rgba(0,0,0,0.4)" }}
    >
      <div className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 group-hover:ring-white/25 transition-all duration-300 pointer-events-none" />

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
          className="absolute top-2 right-2 z-10 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md hover:bg-black/70"
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
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <span className="text-[11px] font-semibold text-white bg-white/15 border border-white/20 rounded-full px-3.5 py-1 backdrop-blur-sm shadow-lg">
          {isLive ? "Join →" : "Open"}
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
  layout?: "responsive" | "scroll";
  /** `browse` = fewer columns on `/circles` for larger cards. */
  density?: "default" | "browse";
  className?: string;
};

/** Handlers shared by grid + browse (everything except `items` / `renderBadge` / `layout`). */
export type ActiveCircleCardGridHandlers = Omit<
  ActiveCircleCardGridProps,
  "items" | "renderBadge" | "layout"
>;

/** Home scroll/grid preview card width — keep in sync with `SCROLL_CARD_WIDTH_CLASS`. */
const SCROLL_CARD_WIDTH = "16rem";
const SCROLL_CARD_WIDTH_CLASS = "w-64";
const SCROLL_CARD_HEIGHT_CLASS = "h-44";

function scrollGridTemplateColumns(count: number): string {
  return `repeat(${Math.min(count, 4)}, ${SCROLL_CARD_WIDTH})`;
}

export function ActiveCircleCardGrid({
  items,
  renderBadge,
  currentUserId,
  onJoinCircle,
  onEditScheduled,
  layout = "responsive",
  density = "default",
  className,
}: ActiveCircleCardGridProps) {
  if (items.length === 0) return null;

  const single = items.length === 1;
  const responsiveGridClass =
    density === "browse"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3";

  return (
    <div
      className={cn(
        layout === "scroll"
          ? cn(
              "flex gap-3 overflow-x-auto pb-1 scrollbar-none",
              single
                ? "md:grid md:grid-cols-1 md:max-w-md md:overflow-visible"
                : "md:grid md:w-fit md:max-w-full md:overflow-visible md:gap-3",
            )
          : responsiveGridClass,
        layout === "scroll" && !single && "md:grid",
        className,
      )}
      style={
        layout === "scroll" && !single
          ? { gridTemplateColumns: scrollGridTemplateColumns(items.length) }
          : undefined
      }
    >
      {items.map((c) => (
        <ActiveCircleCard
          key={c.id}
          circle={c}
          badge={renderBadge?.(c)}
          currentUserId={currentUserId}
          onJoin={onJoinCircle}
          onEditScheduled={onEditScheduled}
          className={
            layout === "scroll"
              ? cn(
                  "flex-none shrink-0",
                  SCROLL_CARD_WIDTH_CLASS,
                  SCROLL_CARD_HEIGHT_CLASS,
                  single ? "md:w-full md:max-w-md" : "md:w-full",
                )
              : undefined
          }
        />
      ))}
    </div>
  );
}

export function ActiveCircleCardSkeleton() {
  return <div className={cn("w-full rounded-2xl bg-muted/40 animate-pulse", SCROLL_CARD_HEIGHT_CLASS)} />;
}

export function ActiveCircleCardSkeletonGrid({
  count = 4,
  layout = "responsive",
}: {
  count?: number;
  layout?: "responsive" | "scroll";
}) {
  return (
    <div
      className={cn(
        layout === "scroll"
          ? "flex gap-3 overflow-hidden md:grid md:w-fit md:max-w-full md:gap-3"
          : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
      )}
      style={
        layout === "scroll"
          ? { gridTemplateColumns: scrollGridTemplateColumns(count) }
          : undefined
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <ActiveCircleCardSkeleton key={i} />
      ))}
    </div>
  );
}
