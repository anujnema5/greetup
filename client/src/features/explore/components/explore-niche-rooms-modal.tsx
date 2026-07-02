"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";

import { useJoinSpace } from "@/features/spaces/hooks/use-join-space";
import { ProfileEditShell } from "@/features/profile/components/profile-edit-shell";
import { Button } from "@/components/ui/button";
import { EXPLORE } from "@/lib/copy/user-messages";

import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";
import { partitionNicheRooms } from "../lib/browse-niche-display";
import type { BrowseNicheItem } from "../types/browse-niches.types";
import { ExploreNicheRoomRow } from "./explore-niche-room-row";

type Props = {
  niche: BrowseNicheItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: readonly ActiveSpaceItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
};

function NicheRoomSection({
  title,
  rooms,
  onJoin,
}: {
  title: string;
  rooms: readonly ActiveSpaceItem[];
  onJoin: (space: ActiveSpaceItem) => void;
}) {
  if (rooms.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {rooms.map((space) => (
          <ExploreNicheRoomRow key={space.id} space={space} onJoin={onJoin} />
        ))}
      </ul>
    </div>
  );
}

export function ExploreNicheRoomsModal({
  niche,
  open,
  onOpenChange,
  rooms,
  isLoading,
  isLoadingMore,
  isError,
  hasMore,
  onLoadMore,
}: Props) {
  const onJoinSpace = useJoinSpace();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const { live, scheduled } = useMemo(() => partitionNicheRooms(rooms), [rooms]);

  const onIntersectLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  useEffect(() => {
    if (!open || !hasMore) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectLoadMore();
      },
      { root: null, rootMargin: "100px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [open, hasMore, onIntersectLoadMore, rooms.length]);

  const title = niche ? EXPLORE.browseNiches.modalTitle(niche.displayName) : "";
  const description =
    niche?.description?.trim() ||
    EXPLORE.browseNiches.modalSubtitle;

  const countHint =
    niche && !isLoading
      ? EXPLORE.browseNiches.groupCounts(niche.liveGroupCount, niche.scheduledGroupCount)
      : null;

  return (
    <ProfileEditShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      }
    >
      {countHint ? (
        <p className="text-[12px] font-medium text-muted-foreground mb-4 -mt-1">{countHint}</p>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <Loader2 className="h-7 w-7 animate-spin text-primary/80" aria-hidden />
          <p className="text-[13px] text-muted-foreground">{EXPLORE.browseNiches.modalLoading}</p>
        </div>
      ) : isError ? (
        <p className="text-[13px] text-muted-foreground text-center py-8 leading-relaxed">
          {EXPLORE.browseNiches.modalError}
        </p>
      ) : rooms.length === 0 ? (
        <p className="text-[13px] text-muted-foreground text-center py-8 leading-relaxed">
          {EXPLORE.browseNiches.modalEmpty}
        </p>
      ) : (
        <div className="flex flex-col gap-5 pb-1">
          <NicheRoomSection
            title={EXPLORE.browseNiches.modalSectionLive}
            rooms={live}
            onJoin={onJoinSpace}
          />
          <NicheRoomSection
            title={EXPLORE.browseNiches.modalSectionScheduled}
            rooms={scheduled}
            onJoin={onJoinSpace}
          />
          <div ref={loadMoreRef} className="h-2 w-full shrink-0" aria-hidden />
          {isLoadingMore ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary/70" aria-hidden />
            </div>
          ) : null}
        </div>
      )}
    </ProfileEditShell>
  );
}
