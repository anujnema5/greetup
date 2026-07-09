"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { NavSidebar, BottomNav, AppSearchTopbar, PageContentHeader } from "@/features/app-shell";
import { OPEN_NOW_PAGE } from "@/lib/copy/user-messages";

import { useOpenNowFeedInfinite } from "../api/open-to-connect.queries";
import { usePendingOutboundByTargetUserId } from "../api/connect-requests.queries";
import {
  OPEN_NOW_BROWSE_GRID_CLASS,
  OPEN_NOW_EXPLORE_PREVIEW_LIMIT,
} from "../constants/open-now.constants";
import { OpenNowEmptyStateIcon } from "../components/open-now-empty-state-icon";
import { OpenNowFilterChips } from "../components/open-now-filter-chips";
import { OpenNowPersonCard, OpenNowPersonCardSkeleton } from "../components/open-now-person-card";
import { useOpenNowFilterChips } from "../hooks/use-open-now-filter-chips";
import type { OpenNowFeedItem } from "../types/open-to-connect.types";
import type { OpenNowFeedFilter } from "../types/open-now-filter.types";
import { openNowFilterQueryArgs } from "../types/open-now-filter.types";

function dedupePeople(items: OpenNowFeedItem[]): OpenNowFeedItem[] {
  const seen = new Set<string>();
  const merged: OpenNowFeedItem[] = [];
  for (const item of items) {
    if (seen.has(item.userId)) continue;
    seen.add(item.userId);
    merged.push(item);
  }
  return merged;
}

export function OpenNowPage() {
  const [activeFilter, setActiveFilter] = useState<OpenNowFeedFilter>({ kind: "all" });
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockedRef = useRef(false);

  const filterArgs = openNowFilterQueryArgs(activeFilter);
  const { chips } = useOpenNowFilterChips();
  const pendingByTarget = usePendingOutboundByTargetUserId();

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useOpenNowFeedInfinite(filterArgs);

  const people = useMemo(
    () => dedupePeople(data?.pages.flatMap((page) => page.items) ?? []),
    [data?.pages],
  );

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || loadMoreLockedRef.current) return;
    loadMoreLockedRef.current = true;
    void fetchNextPage().finally(() => {
      loadMoreLockedRef.current = false;
    });
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    if (!hasNextPage) return;
    const el = loadMoreSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "120px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore, people.length, activeFilter]);

  const showEndMessage = !isLoading && people.length > OPEN_NOW_EXPLORE_PREVIEW_LIMIT && !hasNextPage;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <NavSidebar activePath="/explore" />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        <AppSearchTopbar />

        <div className="flex w-full flex-col gap-5 px-4 py-5 lg:px-8 lg:py-6">
          <PageContentHeader title={OPEN_NOW_PAGE.title} subtitle={OPEN_NOW_PAGE.subtitle} />

          <OpenNowFilterChips
            chips={chips}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          {isLoading ? (
            <div className={OPEN_NOW_BROWSE_GRID_CLASS}>
              {Array.from({ length: 6 }).map((_, index) => (
                <OpenNowPersonCardSkeleton key={index} />
              ))}
            </div>
          ) : isError ? (
            <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-6 text-center text-sm text-muted-foreground">
              {OPEN_NOW_PAGE.error}
            </p>
          ) : people.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <OpenNowEmptyStateIcon />
              <p className="text-sm text-muted-foreground">{OPEN_NOW_PAGE.empty}</p>
            </div>
          ) : (
            <>
              <div className={OPEN_NOW_BROWSE_GRID_CLASS}>
                {people.map((person) => (
                  <OpenNowPersonCard
                    key={person.userId}
                    person={person}
                    showRequestAction
                    pendingRequest={pendingByTarget.get(person.userId)}
                  />
                ))}
              </div>

              {hasNextPage ? (
                <div ref={loadMoreSentinelRef} className="flex justify-center py-2">
                  {isFetchingNextPage ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {OPEN_NOW_PAGE.loadingMore}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showEndMessage ? (
                <p className="text-center text-sm text-muted-foreground">{OPEN_NOW_PAGE.end}</p>
              ) : null}
            </>
          )}
        </div>
      </main>

      <BottomNav activePath="/explore" />
    </div>
  );
}
