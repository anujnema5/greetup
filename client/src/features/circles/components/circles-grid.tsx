"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Orbit } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/section-header";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { useStartCircleModal } from "../components/start-circle-modal-provider";
import { useListActiveCircles } from "../api/circles.queries";
import { CIRCLES_GRID_COPY } from "../constants/circles-browse-copy";
import { useActiveCircleCardActions } from "../hooks/use-active-circle-card-actions";
import { useCircleListBadges } from "../hooks/use-circle-list-badges";
import { dedupeCircles } from "../lib/dedupe-circles";
import { CIRCLES_BROWSE_PATH } from "../lib/circles-browse-path";
import {
  HomeCircleCard,
  HomeCircleCardSkeletonGrid,
} from "./home-circle-card";

const HOME_PREVIEW_LIMIT = 4;

function CirclesGridInner() {
  const router = useRouter();
  const { openModal } = useStartCircleModal();
  const cardHandlers = useActiveCircleCardActions();
  const { data: apiData, isLoading, isError, error, isFetching } = useListActiveCircles();

  const friendInvited = apiData?.friendInvited ?? [];
  const joined = apiData?.joined ?? [];
  const publicItems = apiData?.public.items ?? [];
  const { badgeForCircle } = useCircleListBadges(friendInvited, joined);

  const previewItems = useMemo(
    () => dedupeCircles([...friendInvited, ...joined, ...publicItems]).slice(0, HOME_PREVIEW_LIMIT),
    [friendInvited, joined, publicItems],
  );

  const hasAny = previewItems.length > 0;
  const goToBrowse = () => router.push(CIRCLES_BROWSE_PATH);

  return (
    <section data-tour-id={TOUR_TARGETS.circlesGrid}>
      <SectionHeader
        title={CIRCLES_GRID_COPY.title}
        actionLabel={CIRCLES_GRID_COPY.viewAll}
        onAction={goToBrowse}
      />

      {isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {getApiErrorMessage(error, "Could not load active circles")}
        </p>
      ) : isLoading && !apiData ? (
        <HomeCircleCardSkeletonGrid count={HOME_PREVIEW_LIMIT} />
      ) : !hasAny ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Orbit className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">{CIRCLES_GRID_COPY.emptyPrefix}</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Browse public circles or start your own hang.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={goToBrowse}>
              {CIRCLES_GRID_COPY.exploreLink}
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={openModal}>
              Start a circle
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,280px))] gap-3">
            {previewItems.map((circle) => (
              <HomeCircleCard
                key={circle.id}
                circle={circle}
                badge={badgeForCircle(circle)}
                {...cardHandlers}
              />
            ))}
          </div>
          {isFetching && !isLoading ? (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Updating…</p>
          ) : null}
        </>
      )}
    </section>
  );
}

export const CirclesGrid = memo(CirclesGridInner);
