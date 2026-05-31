"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { CIRCLES_BROWSE_PATH } from "@/features/circles/lib/circles-browse-path";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { circleRoomPath } from "@/features/room/lib/navigation/circle-routes";

import { useDashboardActiveNowCircles } from "../hooks/use-dashboard-active-now-circles";

function ActiveNowRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-3 w-8 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function DashboardActiveNowSection() {
  const router = useRouter();
  const { circles, isLoading } = useDashboardActiveNowCircles();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {DASHBOARD_SECTIONS.activeNow.title}
        </h3>
        <button
          type="button"
          onClick={() => router.push(CIRCLES_BROWSE_PATH)}
          className="cursor-pointer text-xs text-primary hover:underline"
        >
          {DASHBOARD_SECTIONS.activeNow.seeAll}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <ActiveNowRowSkeleton key={index} />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">{DASHBOARD_SECTIONS.activeNow.empty}</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {circles.map((circle) => (
            <button
              key={circle.id}
              type="button"
              onClick={() => router.push(circleRoomPath(circle.id))}
              className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400" />
                <span className="truncate text-xs font-medium text-foreground">{circle.title}</span>
              </div>
              <span className="ml-2 flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                <Users size={10} />
                {circle.participantCount}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
