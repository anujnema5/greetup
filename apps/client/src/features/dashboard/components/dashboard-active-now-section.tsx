"use client";

import { useRouter } from "next/navigation";
import { Radio, Users } from "lucide-react";

import { SPACES_BROWSE_PATH } from "@/features/spaces/lib/spaces-browse-path";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";

import { DashboardSectionHeader } from "./dashboard-section-header";
import { useDashboardActiveNowSpaces } from "../hooks/use-dashboard-active-now-spaces";

function ActiveNowRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
      <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function DashboardActiveNowSection() {
  const router = useRouter();
  const { spaces, isLoading } = useDashboardActiveNowSpaces();

  return (
    <section>
      <DashboardSectionHeader
        variant="panel"
        title={DASHBOARD_SECTIONS.activeNow.title}
        actionLabel={DASHBOARD_SECTIONS.activeNow.seeAll}
        onAction={() => router.push(SPACES_BROWSE_PATH)}
      />

      {isLoading ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <ActiveNowRowSkeleton key={index} />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center">
          <Radio className="mx-auto mb-2 size-4 text-muted-foreground/60" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">{DASHBOARD_SECTIONS.activeNow.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              onClick={() => router.push(spaceRoomPath(space.id))}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm">
                {space.category.emoji ?? "○"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{space.title}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="dash-live-dot size-1.5 rounded-full bg-destructive" aria-hidden />
                  Live · {space.participantCount} <Users className="size-2.5" aria-hidden />
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
