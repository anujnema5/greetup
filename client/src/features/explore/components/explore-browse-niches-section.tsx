"use client";

import { Loader2 } from "lucide-react";

import { EXPLORE } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { formatTopicCircleCount } from "../lib/browse-niche-display";
import type { BrowseNicheItem } from "../types/browse-niches.types";
import { ExploreSectionHeader } from "./explore-section-header";

type Props = {
  niches: readonly BrowseNicheItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectNiche: (niche: BrowseNicheItem) => void;
  hideHeader?: boolean;
};

function topicStatusLabel(niche: BrowseNicheItem): string {
  if (niche.liveGroupCount > 0) {
    return niche.liveGroupCount === 1 ? "1 live now" : `${niche.liveGroupCount} live now`;
  }
  return formatTopicCircleCount(niche);
}

function TopicTile({
  niche,
  onSelect,
}: {
  niche: BrowseNicheItem;
  onSelect: (niche: BrowseNicheItem) => void;
}) {
  const isLive = niche.liveGroupCount > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(niche)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-left",
        "transition-colors duration-150 hover:border-border hover:bg-muted/25",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl text-xl leading-none",
          isLive ? "bg-primary/15" : "bg-muted/60",
        )}
        aria-hidden
      >
        {niche.emoji ?? "○"}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {niche.displayName}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-xs",
            isLive ? "font-medium text-primary" : "text-muted-foreground",
          )}
        >
          {topicStatusLabel(niche)}
        </span>
      </span>
    </button>
  );
}

function TopicSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
      <div className="size-10 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function ExploreBrowseNichesSection({
  niches,
  isLoading,
  isError,
  onRetry,
  onSelectNiche,
  hideHeader = false,
}: Props) {
  if (!isLoading && !isError && niches.length === 0) {
    return null;
  }

  const Wrapper = hideHeader ? "div" : "section";

  return (
    <Wrapper>
      {hideHeader ? null : (
        <ExploreSectionHeader
          title={EXPLORE.browseTopics.title}
          subtitle={EXPLORE.browseNiches.subtitle}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <TopicSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm">
          <p className="text-muted-foreground">{EXPLORE.browseNiches.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 cursor-pointer text-xs font-semibold text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {niches.map((niche) => (
            <TopicTile key={niche.id} niche={niche} onSelect={onSelectNiche} />
          ))}
        </div>
      )}
    </Wrapper>
  );
}
