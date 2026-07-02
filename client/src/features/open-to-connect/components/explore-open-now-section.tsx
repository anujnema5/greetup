"use client";

import { useRouter } from "next/navigation";

import { HorizontalCardCarousel } from "@/components/horizontal-card-carousel";
import { EXPLORE } from "@/lib/copy/user-messages";
import { ExploreSectionHeader } from "@/features/explore/components/explore-section-header";

import { useOpenNowFeed } from "../api/open-to-connect.queries";
import { usePendingOutboundByTargetUserId } from "../api/connect-requests.queries";
import {
  OPEN_NOW_EXPLORE_GRID_CLASS,
  OPEN_NOW_EXPLORE_PREVIEW_LIMIT,
} from "../constants/open-now.constants";
import { OpenNowEmptyStateIcon } from "./open-now-empty-state-icon";
import { OpenNowPersonCard, OpenNowPersonCardSkeleton } from "./open-now-person-card";

export function ExploreOpenNowSection() {
  const router = useRouter();
  const { data, isLoading, isError } = useOpenNowFeed();
  const pendingByTarget = usePendingOutboundByTargetUserId();
  const allPeople = data?.items ?? [];
  const people = allPeople.slice(0, OPEN_NOW_EXPLORE_PREVIEW_LIMIT);

  return (
    <section>
      <ExploreSectionHeader
        title={EXPLORE.openNow.title}
        actionLabel={EXPLORE.peopleToMeet.viewAll}
        onAction={() => router.push("/open-now")}
      />

      {isLoading ? (
        <HorizontalCardCarousel
          itemCount={OPEN_NOW_EXPLORE_PREVIEW_LIMIT}
          desktopClassName={OPEN_NOW_EXPLORE_GRID_CLASS}
          ariaLabel={EXPLORE.openNow.title}
        >
          {Array.from({ length: OPEN_NOW_EXPLORE_PREVIEW_LIMIT }).map((_, index) => (
            <OpenNowPersonCardSkeleton key={index} />
          ))}
        </HorizontalCardCarousel>
      ) : isError ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-6 text-center text-sm text-muted-foreground">
          {EXPLORE.openNow.error}
        </p>
      ) : people.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <OpenNowEmptyStateIcon />
          <p className="text-sm text-muted-foreground">{EXPLORE.openNow.empty}</p>
        </div>
      ) : (
        <HorizontalCardCarousel
          itemCount={people.length}
          desktopClassName={OPEN_NOW_EXPLORE_GRID_CLASS}
          ariaLabel={EXPLORE.openNow.title}
        >
          {people.map((person) => (
            <OpenNowPersonCard
              key={person.userId}
              person={person}
              showRequestAction
              pendingRequest={pendingByTarget.get(person.userId)}
            />
          ))}
        </HorizontalCardCarousel>
      )}
    </section>
  );
}
