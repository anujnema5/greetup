"use client";



import { useRouter } from "next/navigation";

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

  const showSeeAll =

    allPeople.length > OPEN_NOW_EXPLORE_PREVIEW_LIMIT || Boolean(data?.nextCursor) || allPeople.length > 0;



  return (

    <section>

      <ExploreSectionHeader

        title={EXPLORE.openNow.title}

        actionLabel={showSeeAll ? EXPLORE.peopleToMeet.viewAll : undefined}

        onAction={showSeeAll ? () => router.push("/open-now") : undefined}

      />



      {isLoading ? (

        <div className={OPEN_NOW_EXPLORE_GRID_CLASS}>

          {Array.from({ length: OPEN_NOW_EXPLORE_PREVIEW_LIMIT }).map((_, index) => (

            <OpenNowPersonCardSkeleton key={index} />

          ))}

        </div>

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

        <div className={OPEN_NOW_EXPLORE_GRID_CLASS}>

          {people.map((person) => (

            <OpenNowPersonCard

              key={person.userId}

              person={person}

              showRequestAction

              pendingRequest={pendingByTarget.get(person.userId)}

            />

          ))}

        </div>

      )}

    </section>

  );

}

