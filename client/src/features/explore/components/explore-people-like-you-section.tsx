"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";

import { EXPLORE } from "@/lib/copy/user-messages";

import { ExploreSuggestedPeopleList } from "./explore-suggested-people-list";
import { ExploreSuggestedPersonCardSkeleton } from "./explore-suggested-person-card";
import { ExploreSectionHeader } from "./explore-section-header";
import type { SuggestedPersonItem } from "../types/suggested-people.types";

type Props = {
  subtitle?: string;
  hasUserInterests: boolean;
  hasLoadedData?: boolean;
  isLoading: boolean;
  isError: boolean;
  showEmptyNoMatches: boolean;
  people: readonly SuggestedPersonItem[];
  canLoadMore: boolean;
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>;
  showEndMessage: boolean;
  title?: ReactNode;
};

export function ExplorePeopleLikeYouSection({
  subtitle,
  hasUserInterests,
  hasLoadedData = false,
  isLoading,
  isError,
  showEmptyNoMatches,
  people,
  canLoadMore,
  loadMoreSentinelRef,
  showEndMessage,
  title = EXPLORE.peopleToMeet.title,
}: Props) {
  const headerTitle = typeof title === "string" ? title : EXPLORE.peopleToMeet.title;

  return (
    <section>
      {typeof title === "string" ? (
        <ExploreSectionHeader title={headerTitle} subtitle={subtitle} />
      ) : (
        <>
          <h2 className="mb-1 text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          ) : (
            <div className="mb-4" />
          )}
        </>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ExploreSuggestedPersonCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {isError && !isLoading ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-6 text-center text-sm text-muted-foreground">
          {EXPLORE.peopleLikeYou.error}
        </p>
      ) : null}

      {showEmptyNoMatches ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {EXPLORE.peopleLikeYou.emptyNoMatches}
        </p>
      ) : null}

      {!hasUserInterests && hasLoadedData && !isLoading && !isError ? (
        <Link
          href="/profile"
          className="mb-4 inline-flex text-xs font-semibold text-primary hover:underline"
        >
          {EXPLORE.peopleLikeYou.editProfile}
        </Link>
      ) : null}

      {!isLoading && people.length > 0 ? (
        <ExploreSuggestedPeopleList
          people={people}
          canLoadMore={canLoadMore}
          loadMoreSentinelRef={loadMoreSentinelRef}
          showEndMessage={showEndMessage}
        />
      ) : null}
    </section>
  );
}
