"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { useListActiveCirclesQuery } from "../api/circles-api";
import { CIRCLES_GRID_COPY } from "../constants/circles-browse-copy";
import { useActiveCircleCardActions } from "../hooks/use-active-circle-card-actions";
import { useCircleListBadges } from "../hooks/use-circle-list-badges";
import { dedupeCircles } from "../lib/dedupe-circles";
import { CIRCLES_BROWSE_PATH } from "../lib/circles-browse-path";
import {
  ActiveCircleCardGrid,
  ActiveCircleCardSkeletonGrid,
} from "./active-circle-card";

const HOME_PREVIEW_LIMIT = 5;

function CirclesGridInner() {
  const router = useRouter();
  const cardHandlers = useActiveCircleCardActions();
  const { data, isLoading, isError, error, isFetching } = useListActiveCirclesQuery(
    {},
    { refetchOnMountOrArgChange: true },
  );

  const apiData = data?.data;
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
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{CIRCLES_GRID_COPY.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{CIRCLES_GRID_COPY.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={goToBrowse}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline cursor-pointer"
        >
          {CIRCLES_GRID_COPY.viewAll} <ChevronRight size={12} />
        </button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive py-6 text-center">
          {getRtkMutationErrorMessage(error, "Could not load active circles")}
        </p>
      ) : isLoading && !apiData ? (
        <ActiveCircleCardSkeletonGrid count={HOME_PREVIEW_LIMIT} layout="scroll" />
      ) : !hasAny ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {CIRCLES_GRID_COPY.emptyPrefix}{" "}
          <button
            type="button"
            onClick={goToBrowse}
            className="text-primary font-medium hover:underline cursor-pointer"
          >
            {CIRCLES_GRID_COPY.exploreLink}
          </button>
        </p>
      ) : (
        <>
          <ActiveCircleCardGrid
            items={previewItems}
            layout="scroll"
            renderBadge={badgeForCircle}
            {...cardHandlers}
          />
          {isFetching && !isLoading ? (
            <p className="text-[11px] text-muted-foreground text-center mt-2">Updating…</p>
          ) : null}
        </>
      )}
    </div>
  );
}

export const CirclesGrid = memo(CirclesGridInner);
