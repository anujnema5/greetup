"use client";

import { useMemo, useRef } from "react";
import { Loader2, UsersRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePeersOnlineStatus } from "@/features/presence";
import { cn } from "@/lib/utils";
import { RECENT_MATCHES } from "@/lib/copy/user-messages";

import {
  PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT,
  useProfileInsights,
} from "../api/profile-insights.queries";
import { useProfileRecentMatchCall } from "../hooks/use-profile-recent-match-call";
import { useRecentMatchesScrollPagination } from "../hooks/use-recent-matches-scroll-pagination";
import { RecentMatchRow } from "./recent-match-row";

type RecentMatchesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function MatchRowSkeleton() {
  return (
    <div className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function RecentMatchesDialog({
  open,
  onOpenChange,
}: RecentMatchesDialogProps) {
  const { data, isLoading, isFetching } = useProfileInsights(
    { recentLimit: PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT },
    { enabled: open, refetchOnMount: 'always' },
  );

  const {
    startRecentMatchCall,
    openRecentMatchMessage,
    isCallingPeerId,
    isMessagingPeerId,
    isStartingCall,
    isOpeningMessage,
  } = useProfileRecentMatchCall();

  const matches = useMemo(() => data?.recentMatches ?? [], [data?.recentMatches]);

  const scrollRootRef = useRef<HTMLDivElement>(null);

  const resetKey = open ? `all-${matches.length}` : "closed";

  const { visibleCount, hasMore, isLoadingMore, loadMoreSentinelRef } =
    useRecentMatchesScrollPagination({
      totalCount: matches.length,
      resetKey,
      enabled: open && matches.length > 0,
      scrollRootRef,
    });

  const visibleMatches = useMemo(
    () => matches.slice(0, visibleCount),
    [matches, visibleCount],
  );

  const peerIds = useMemo(
    () => visibleMatches.map((match) => match.peerUserId),
    [visibleMatches],
  );
  const { isOnline } = usePeersOnlineStatus(open ? peerIds : []);

  const loadingInitial = isLoading || (isFetching && matches.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton>
        <div className="border-b border-border px-5 pb-3 pt-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
              <UsersRound className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <DialogTitle className="text-[13px] font-semibold leading-none text-foreground">
                {RECENT_MATCHES.dialogTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12px] leading-snug">
                {RECENT_MATCHES.dialogDescription}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div
          ref={scrollRootRef}
          className={cn(
            "overflow-y-auto overscroll-contain px-5 py-4",
            "max-h-[min(62vh,480px)]",
            "[-webkit-overflow-scrolling:touch] touch-pan-y",
          )}
        >
          {loadingInitial ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <MatchRowSkeleton key={index} />
              ))}
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
              <p className="text-[13px] font-medium text-foreground">{RECENT_MATCHES.emptyTitle}</p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                {RECENT_MATCHES.emptyBody}
              </p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-2 pb-1">
                {visibleMatches.map((match) => (
                  <RecentMatchRow
                    key={`${match.peerUserId}-${match.matchedAt}`}
                    match={match}
                    isOnline={isOnline(match.peerUserId)}
                    onCall={(item, mode) => void startRecentMatchCall(item, mode)}
                    onMessage={(item) => void openRecentMatchMessage(item)}
                    isCalling={isStartingCall && isCallingPeerId === match.peerUserId}
                    isMessaging={isOpeningMessage && isMessagingPeerId === match.peerUserId}
                  />
                ))}
              </ul>

              {hasMore || isLoadingMore ? (
                <div className="flex flex-col items-center gap-2 py-3">
                  {isLoadingMore ? (
                    <Loader2
                      className="h-6 w-6 animate-spin text-primary/80"
                      aria-label="Loading more matches"
                    />
                  ) : null}
                  <div ref={loadMoreSentinelRef} className="h-3 w-full shrink-0" aria-hidden />
                </div>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
