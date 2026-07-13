"use client";

import { useDashboardTrendingTopics } from "../hooks/use-dashboard-trending-topics";

function TopicSkeleton() {
  return <div className="h-7 w-20 animate-pulse rounded-full bg-muted" />;
}

export function DashboardTrendingTopicsSection() {
  const { topics, isLoading } = useDashboardTrendingTopics();

  if (!isLoading && topics.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Trending topics
      </h3>

      {isLoading ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <TopicSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {topics.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
