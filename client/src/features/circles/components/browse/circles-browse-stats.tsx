"use client";

import { Compass, LayoutGrid, UserRound, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

type CirclesBrowseStatsProps = {
  invitedCount: number;
  joinedCount: number;
  discoverCount: number;
  className?: string;
};

function StatPill({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof LayoutGrid;
  label: string;
  count: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-border bg-card/50 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none tabular-nums text-foreground">{count}</p>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mt-0.5 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

export function CirclesBrowseStats({
  invitedCount,
  joinedCount,
  discoverCount,
  className,
}: CirclesBrowseStatsProps) {
  const total = invitedCount + joinedCount + discoverCount;

  return (
    <div className={cn("grid grid-cols-2 gap-2 lg:grid-cols-4", className)}>
      <StatPill icon={LayoutGrid} label="Total" count={total} />
      <StatPill icon={UserRound} label="Invited" count={invitedCount} />
      <StatPill icon={UsersRound} label="Yours" count={joinedCount} />
      <StatPill icon={Compass} label="Discover" count={discoverCount} />
    </div>
  );
}
