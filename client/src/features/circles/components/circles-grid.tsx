"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Users } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useListActiveCirclesQuery } from "../api/circles-api";
import type { ActiveCircleItem } from "../types/circles-api.types";
import { EditScheduledCircleDialog } from "./edit-scheduled-circle-dialog";

// ─── Colour palette — pick deterministically by room id so colour is stable across re-renders ─────
const COVERS = [
  "from-violet-600/80 via-violet-700/60 to-purple-900",
  "from-sky-500/80 via-blue-700/60 to-indigo-900",
  "from-amber-500/80 via-orange-600/60 to-orange-900",
  "from-emerald-500/80 via-teal-700/60 to-teal-900",
  "from-fuchsia-500/80 via-purple-700/60 to-purple-900",
  "from-rose-500/80 via-red-700/60 to-red-900",
  "from-cyan-500/80 via-sky-700/60 to-blue-900",
];

function coverFor(id: string) {
  const n = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COVERS[n % COVERS.length];
}

function hostLabel(host: ActiveCircleItem["host"]) {
  return host.displayName?.trim() || host.name?.trim() || "Host";
}

/** Human-readable local start time for scheduled circles. */
function formatScheduledStart(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

// ─── Single card ─────────────────────────────────────────────────────────────
function CircleCard({
  circle,
  badge,
  currentUserId,
  onJoin,
  onEditScheduled,
}: {
  circle: ActiveCircleItem;
  badge?: React.ReactNode;
  currentUserId: string | null;
  onJoin: (circle: ActiveCircleItem) => void;
  onEditScheduled?: (circle: ActiveCircleItem) => void;
}) {
  const cover = coverFor(circle.id);
  const isLive = circle.status === "live";
  const scheduledLabel = formatScheduledStart(circle.scheduledStartAt);
  const isHost = Boolean(currentUserId && circle.host.userId === currentUserId);
  const showEdit = isHost && !isLive && circle.scheduledStartAt && onEditScheduled;

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
        "group relative flex-none w-36 md:w-auto h-44 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-linear-to-br text-left border-0 p-0 font-inherit outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        cover,
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
            onEditScheduled(circle);
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
        {!isLive && scheduledLabel ? (
          <p className="text-[10px] text-white/70 mt-0.5">Starts {scheduledLabel}</p>
        ) : null}
        <p className="text-[10px] text-white/50 mt-0.5">by {hostLabel(circle.host)}</p>
        {isHost ? (
          <p className="text-[9px] font-semibold text-amber-200/90 mt-0.5">You are hosting</p>
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

// ─── Section row (horizontal scroll on mobile, grid on desktop) ──────────────
function CircleRow({
  items,
  renderBadge,
  currentUserId,
  onJoinCircle,
  onEditScheduled,
}: {
  items: ActiveCircleItem[];
  renderBadge?: (item: ActiveCircleItem) => React.ReactNode;
  currentUserId: string | null;
  onJoinCircle: (circle: ActiveCircleItem) => void;
  onEditScheduled?: (circle: ActiveCircleItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div
      className="flex gap-3 overflow-x-auto pb-1 md:overflow-visible md:grid md:gap-3 scrollbar-none"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((c) => (
        <CircleCard
          key={c.id}
          circle={c}
          badge={renderBadge?.(c)}
          currentUserId={currentUserId}
          onJoin={onJoinCircle}
          onEditScheduled={onEditScheduled}
        />
      ))}
    </div>
  );
}

const FriendBadge = (
  <span className="text-[10px] font-bold text-black/80 bg-primary/80 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
    Invited
  </span>
);

const JoinedBadge = (
  <span className="text-[9px] tracking-wide font-bold text-white bg-emerald-600/80 rounded-full px-1.5 py-0.5 backdrop-blur-sm">
    Joined
  </span>
);

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return <div className="flex-none w-36 md:w-auto h-44 rounded-2xl bg-muted/40 animate-pulse" />;
}

function SkeletonRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-x-hidden md:grid md:gap-3" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function dedupeCircles(items: ActiveCircleItem[]): ActiveCircleItem[] {
  const seen = new Set<string>();
  const out: ActiveCircleItem[] = [];
  for (const c of items) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

// ─── Main component ───────────────────────────────────────────────────────────
function CirclesGridInner() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [editTarget, setEditTarget] = useState<ActiveCircleItem | null>(null);

  const { data, isLoading } = useListActiveCirclesQuery({}, { refetchOnMountOrArgChange: true });

  const goToCircleRoom = useCallback(
    (circle: ActiveCircleItem) => {
      router.push(`/circle/${circle.id}`);
    },
    [router],
  );

  const apiData = data?.data;
  const friendInvited = apiData?.friendInvited ?? [];
  const joined = apiData?.joined ?? [];
  const publicItems = apiData?.public.items ?? [];

  const allItems = useMemo(
    () => dedupeCircles([...friendInvited, ...joined, ...publicItems]).slice(0, 5),
    [friendInvited, joined, publicItems],
  );

  const hasAny = allItems.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Active Circles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live now or coming up soon</p>
        </div>
        {hasAny && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer"
          >
            View all <ChevronRight size={12} />
          </button>
        )}
      </div>

      {isLoading && !apiData ? (
        <SkeletonRow />
      ) : !hasAny ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No active circles right now — start one!
        </p>
      ) : (
        <CircleRow
          items={allItems}
          currentUserId={currentUserId}
          onJoinCircle={goToCircleRoom}
          onEditScheduled={(c) => setEditTarget(c)}
          renderBadge={(c) => {
            if (friendInvited.find((f) => f.id === c.id)) return FriendBadge;
            if (joined.find((j) => j.id === c.id)) return JoinedBadge;
            return null;
          }}
        />
      )}

      <EditScheduledCircleDialog
        circle={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(o) => {
          if (!o) setEditTarget(null);
        }}
      />
    </div>
  );
}

export const CirclesGrid = memo(CirclesGridInner);
