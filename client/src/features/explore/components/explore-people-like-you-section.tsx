"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";

import { EXPLORE } from "@/lib/copy/user-messages";

import { ExploreSuggestedPeopleList } from "./explore-suggested-people-list";
import type { SuggestedPersonItem } from "../types/suggested-people.types";

type Props = {
  subtitle?: string;
  hasUserInterests: boolean;
  isLoading: boolean;
  isError: boolean;
  showEmptyNoMatches: boolean;
  people: readonly SuggestedPersonItem[];
  canLoadMore: boolean;
  loadMoreSentinelRef: RefObject<HTMLDivElement | null>;
  showEndMessage: boolean;
  /** When set, section title is handled by the parent (e.g. search mode). */
  title?: ReactNode;
};

export function ExplorePeopleLikeYouSection({
  subtitle,
  hasUserInterests,
  isLoading,
  isError,
  showEmptyNoMatches,
  people,
  canLoadMore,
  loadMoreSentinelRef,
  showEndMessage,
  title = EXPLORE.peopleLikeYou.title,
}: Props) {
  return (
    <>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {subtitle ? (
        <p className="text-xs text-muted-foreground mt-1 mb-3">{subtitle}</p>
      ) : (
        <div className="mb-3" />
      )}

      {isLoading && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          {EXPLORE.peopleLikeYou.loading}
        </p>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-muted-foreground mb-3">{EXPLORE.peopleLikeYou.error}</p>
      )}

      {showEmptyNoMatches && (
        <p className="text-sm text-muted-foreground mb-3">
          {EXPLORE.peopleLikeYou.emptyNoMatches}
        </p>
      )}

      {!hasUserInterests && !isLoading && (
        <Link
          href="/profile"
          className="inline-block text-xs font-semibold text-primary mb-3 hover:underline"
        >
          {EXPLORE.peopleLikeYou.editProfile}
        </Link>
      )}

      {!isLoading && people.length > 0 && (
        <ExploreSuggestedPeopleList
          people={people}
          canLoadMore={canLoadMore}
          loadMoreSentinelRef={loadMoreSentinelRef}
          showEndMessage={showEndMessage}
        />
      )}
    </>
  );
}
