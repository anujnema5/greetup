"use client";

import { useRouter } from "next/navigation";

import { DashboardSectionHeader } from "@/features/dashboard/components/dashboard-section-header";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";

import { useOpenNowSidebar } from "../api/open-to-connect.queries";
import { OpenNowEmptyStateIcon } from "./open-now-empty-state-icon";
import { OpenNowPersonCard, OpenNowPersonCardSkeleton } from "./open-now-person-card";

export function DashboardOpenNowSidebarSection() {
  const router = useRouter();
  const { data, isLoading, isError } = useOpenNowSidebar();
  const people = data?.items ?? [];

  return (
    <section>
      <DashboardSectionHeader
        variant="panel"
        title={DASHBOARD_SECTIONS.openNow.title}
        actionLabel={people.length > 0 ? DASHBOARD_SECTIONS.openNow.seeAll : undefined}
        onAction={people.length > 0 ? () => router.push("/open-now") : undefined}
      />

      {isLoading ? (
        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <OpenNowPersonCardSkeleton key={index} variant="compact" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-4 text-center text-xs text-muted-foreground">
          Could not load.
        </p>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center">
          <OpenNowEmptyStateIcon size="sm" />
          <p className="text-xs leading-relaxed text-muted-foreground">{DASHBOARD_SECTIONS.openNow.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {people.map((person) => (
            <OpenNowPersonCard key={person.userId} person={person} variant="compact" />
          ))}
        </div>
      )}
    </section>
  );
}
