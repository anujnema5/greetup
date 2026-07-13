"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { RecentMatchesDialog } from "@/features/profile/components/recent-matches-dialog";
import {
  formatRecentMatchShort,
  profileAvatarGradientClass,
} from "@/features/profile/lib/profile-insights-display";
import type { ProfileRecentMatch } from "@/features/profile/types/profile-insights.types";
import { getProfileImageUrl } from "@/lib/ui/profile-image";
import { DASHBOARD_SECTIONS } from "@/lib/copy/user-messages";
import { cn } from "@/lib/utils";

import { useDashboardInsights } from "../hooks/use-dashboard-insights";

const MAIN_MATCHES_PREVIEW_LIMIT = 5;

function MatchCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-5 text-center">
      <div className="mx-auto mb-2.5 size-[60px] animate-pulse rounded-full bg-muted" />
      <div className="mx-auto h-3.5 w-16 animate-pulse rounded bg-muted" />
      <div className="mx-auto mt-1.5 h-3 w-12 animate-pulse rounded bg-muted" />
    </div>
  );
}

type MatchCardProps = {
  match: ProfileRecentMatch;
};

function MatchCard({ match }: MatchCardProps) {
  const profileHref = match.username ? `/u/${encodeURIComponent(match.username)}` : null;
  const avatarSrc = getProfileImageUrl(match.image);
  const when = formatRecentMatchShort(match.matchedAt);

  const inner = (
    <>
      {match.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarSrc} alt="" className="mx-auto mb-2.5 size-[60px] rounded-full object-cover" />
      ) : (
        <div
          className={cn(
            "mx-auto mb-2.5 flex size-[60px] items-center justify-center rounded-full bg-linear-to-br text-[21px] font-bold text-white",
            profileAvatarGradientClass(match.peerUserId),
          )}
        >
          {match.initials}
        </div>
      )}
      <p className="truncate text-[14.5px] font-semibold text-foreground">{match.displayName}</p>
      {when ? <p className="mt-0.5 text-[12.5px] text-muted-foreground">{when}</p> : null}
    </>
  );

  if (profileHref) {
    return (
      <Link
        href={profileHref}
        className="rounded-2xl border border-border bg-card px-3.5 py-5 text-center transition-colors duration-150 hover:bg-muted/20"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-5 text-center">{inner}</div>
  );
}

export function DashboardMainRecentMatchesSection() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { insights, isLoading, isFetching } = useDashboardInsights();

  const previewMatches = useMemo(
    () => (insights?.recentMatches ?? []).slice(0, MAIN_MATCHES_PREVIEW_LIMIT),
    [insights?.recentMatches],
  );

  const loading = isLoading || isFetching;
  const hasMatches = (insights?.recentMatches.length ?? 0) > 0;

  return (
    <>
      <section className="mb-7">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {DASHBOARD_SECTIONS.recentMatches.title}
          </h2>
          {hasMatches ? (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-primary hover:text-tertiary-foreground"
            >
              {DASHBOARD_SECTIONS.recentMatches.seeAll}
              <ChevronRight size={15} aria-hidden />
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <MatchCardSkeleton key={index} />
            ))}
          </div>
        ) : previewMatches.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {DASHBOARD_SECTIONS.recentMatches.empty}
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {previewMatches.map((match) => (
              <MatchCard key={`${match.peerUserId}-${match.matchedAt}`} match={match} />
            ))}
          </div>
        )}
      </section>

      <RecentMatchesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
