"use client";

import { memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Orbit } from "lucide-react";

import { HorizontalCardCarousel } from "@/components/horizontal-card-carousel";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/section-header";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { TOUR_TARGETS } from "@/features/tour-guide";
import { useStartSpaceModal } from "../components/start-space-modal-provider";
import { useListActiveSpaces } from "../api/spaces.queries";
import { SPACES_GRID_COPY } from "../constants/spaces-browse-copy";
import { useActiveSpaceCardActions } from "../hooks/use-active-space-card-actions";
import { useSpaceListBadges } from "../hooks/use-space-list-badges";
import { dedupeSpaces } from "../lib/dedupe-spaces";
import { SPACES_BROWSE_PATH } from "../lib/spaces-browse-path";
import { SPACE_PREVIEW_DESKTOP_GRID_CLASS } from "../lib/space-preview-grid-classes";
import {
  HomeSpaceCard,
  HomeSpaceCardSkeleton,
} from "./home-space-card";

const HOME_PREVIEW_LIMIT = 4;

function SpacesGridInner() {
  const router = useRouter();
  const { openModal } = useStartSpaceModal();
  const cardHandlers = useActiveSpaceCardActions();
  const { data: apiData, isLoading, isError, error, isFetching } = useListActiveSpaces();

  const friendInvited = apiData?.friendInvited ?? [];
  const joined = apiData?.joined ?? [];
  const publicItems = apiData?.public.items ?? [];
  const { badgeForSpace } = useSpaceListBadges(friendInvited, joined);

  const previewItems = useMemo(
    () => dedupeSpaces([...friendInvited, ...joined, ...publicItems]).slice(0, HOME_PREVIEW_LIMIT),
    [friendInvited, joined, publicItems],
  );

  const hasAny = previewItems.length > 0;
  const goToBrowse = () => router.push(SPACES_BROWSE_PATH);

  return (
    <section data-tour-id={TOUR_TARGETS.spacesGrid}>
      <SectionHeader
        className="mb-2.5"
        title={SPACES_GRID_COPY.title}
        actionLabel={SPACES_GRID_COPY.viewAll}
        onAction={goToBrowse}
      />

      {isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
          {getApiErrorMessage(error, "Could not load active spaces")}
        </p>
      ) : isLoading && !apiData ? (
        <HorizontalCardCarousel
          itemCount={HOME_PREVIEW_LIMIT}
          gridBreakpoint="md"
          desktopClassName={SPACE_PREVIEW_DESKTOP_GRID_CLASS}
          mobileSlideClassName="w-[min(88%,300px)] shrink-0 snap-start"
          ariaLabel={SPACES_GRID_COPY.title}
        >
          {Array.from({ length: HOME_PREVIEW_LIMIT }).map((_, index) => (
            <HomeSpaceCardSkeleton key={index} />
          ))}
        </HorizontalCardCarousel>
      ) : !hasAny ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Orbit className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">{SPACES_GRID_COPY.emptyPrefix}</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Browse public spaces or start your own hang.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={goToBrowse}>
              {SPACES_GRID_COPY.exploreLink}
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={openModal}>
              Start a space
            </Button>
          </div>
        </div>
      ) : (
        <>
          <HorizontalCardCarousel
            itemCount={previewItems.length}
            gridBreakpoint="md"
            desktopClassName={SPACE_PREVIEW_DESKTOP_GRID_CLASS}
            mobileSlideClassName="w-[min(88%,300px)] shrink-0 snap-start"
            ariaLabel={SPACES_GRID_COPY.title}
          >
            {previewItems.map((space) => (
              <HomeSpaceCard
                key={space.id}
                space={space}
                badge={badgeForSpace(space)}
                {...cardHandlers}
              />
            ))}
          </HorizontalCardCarousel>
          {isFetching && !isLoading ? (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Updating…</p>
          ) : null}
        </>
      )}
    </section>
  );
}

export const SpacesGrid = memo(SpacesGridInner);
