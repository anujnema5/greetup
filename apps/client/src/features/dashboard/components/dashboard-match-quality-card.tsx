"use client";

import { Zap } from "lucide-react";

import { useDashboardInsights } from "../hooks/use-dashboard-insights";

type DashboardMatchQualityCardProps = {
  className?: string;
};

export function DashboardMatchQualityCard({ className }: DashboardMatchQualityCardProps) {
  const { heroStats, isLoading } = useDashboardInsights();
  const alignedCount = heroStats.alignedMatchCount;

  if (isLoading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-2 rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3.5">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (alignedCount <= 0) {
    return (
      <div className={className}>
        <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <Zap size={13} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Ready to find your people</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Complete your profile and hit Find Match to start connecting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-2xl border border-primary/15 bg-primary/8 px-4 py-3.5">
        <div className="mb-1.5 flex items-center gap-2">
          <Zap size={13} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">High match quality today</p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          We found{" "}
          <span className="font-semibold text-primary">
            {alignedCount} {alignedCount === 1 ? "person" : "people"}
          </span>{" "}
          with strong alignment. Hit Find Match to connect.
        </p>
      </div>
    </div>
  );
}
