"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Video, Zap } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MATCH_FOUND_DIALOG } from "@/lib/copy/user-messages";
import { formatMatchCompatibility } from "../lib/format-match-compatibility";
import { useMatchPeerPreview } from "../api/matching.queries";

export type MatchFoundDialogProps = {
  open: boolean;
  peerUserId: string | undefined;
  matchScore: number | undefined;
  isFallbackMatch?: boolean;
  busy?: boolean;
  waitingForPeerConnect?: boolean;
  onSkip: () => void;
  onConnect: () => void;
  onCancelSearch: () => void;
};

export function MatchFoundDialog({
  open,
  peerUserId,
  matchScore,
  isFallbackMatch,
  busy,
  waitingForPeerConnect = false,
  onSkip,
  onConnect,
  onCancelSearch,
}: MatchFoundDialogProps) {
  const skipQuery = !open || !peerUserId;
  const { data: peer, isFetching } = useMatchPeerPreview(peerUserId ?? "", {
    enabled: !skipQuery,
  });

  const displayName = peer?.displayName ?? "Someone";
  const initials = peer?.initials ?? "?";
  const headline = peer?.headline;
  const tags = peer?.interestTags ?? [];
  const moreCount = peer?.moreInterestsCount ?? 0;
  const online = peer?.isOnline ?? true;
  const insight = peer?.insight ?? null;
  const image = peer?.image ?? null;

  const [showInsight, setShowInsight] = useState(false);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowInsight(false);
      return;
    }
    if (!insight) return;
    const t = setTimeout(() => setShowInsight(true), 500);
    return () => clearTimeout(t);
  }, [open, insight]);

  const scorePct =
    matchScore != null && Number.isFinite(matchScore)
      ? Math.min(100, Math.max(0, Math.round(matchScore)))
      : null;
  const compatibility = scorePct != null ? formatMatchCompatibility(scorePct) : null;

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-220"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={cn(
          "z-220",
          "max-w-[min(100%-1.5rem,360px)] gap-0 overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-[360px]",
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Match found with {displayName}</DialogTitle>

        <div className="flex flex-col items-center px-5 pt-5 pb-4">
          <div className="match-found-badge">Match Found</div>

          <div className="relative mb-2.5">
            <div
              className={cn(
                image ? "match-found-avatar-image" : "match-found-avatar-fallback",
                "flex size-20 items-center justify-center overflow-hidden rounded-full text-lg font-bold shadow-lg sm:size-21 sm:text-xl",
              )}
            >
              {isFetching ? (
                <span className="size-6 animate-pulse rounded-md bg-muted-foreground/20" />
              ) : image ? (
                <Image
                  src={image}
                  alt={displayName}
                  width={80}
                  height={80}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                initials
              )}
            </div>
            {online && (
              <span
                className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-card bg-emerald-500"
                title="Online"
              />
            )}
          </div>

          <h2 className="max-w-full truncate px-1 text-center text-base font-bold tracking-tight text-foreground sm:text-[1.05rem]">
            {displayName}
          </h2>
          {headline ? (
            <p className="mt-1 max-w-[280px] text-center text-[12px] leading-snug text-muted-foreground">{headline}</p>
          ) : (
            <p className="mt-1 text-center text-[12px] text-muted-foreground">New connection</p>
          )}

          {isFallbackMatch && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Relaxed match — fewer filters than usual.
            </p>
          )}
        </div>

        {compatibility != null && scorePct != null && (
          <div className="mx-5 mb-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Zap className="size-3 shrink-0 text-primary" strokeWidth={2.2} />
                {MATCH_FOUND_DIALOG.compatibilityLabel}
              </span>
              <span className="text-xs font-bold text-primary">{compatibility.fitLabel}</span>
            </div>
            <div className="match-found-score-track">
              <ProgressBar
                value={scorePct}
                max={100}
                aria-label={compatibility.progressAriaLabel}
                className="h-1.5 w-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-linear-to-r [&::-webkit-progress-value]:from-primary [&::-webkit-progress-value]:to-secondary [&::-webkit-progress-value]:shadow-[0_0_12px_oklch(from_var(--primary)_l_c_h/0.35)] [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-700"
              />
            </div>
            <p className="mt-2 text-center text-[10px] leading-snug text-muted-foreground">
              {compatibility.description}
            </p>
          </div>
        )}

        {insight && (
          <div
            className={cn(
              "mx-5 mb-3 rounded-xl border border-border bg-muted/50 px-3 py-2 text-center text-[11px] leading-snug text-foreground/90 transition-all duration-500",
              showInsight ? "opacity-100 translate-y-0" : "pointer-events-none translate-y-1 opacity-0",
            )}
          >
            {insight}
          </div>
        )}

        {(tags.length > 0 || moreCount > 0) && (
          <div className="mx-5 mb-4 flex flex-wrap justify-center gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {t}
              </span>
            ))}
            {moreCount > 0 && (
              <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                +{moreCount} more
              </span>
            )}
          </div>
        )}

        {waitingForPeerConnect ? (
          <p className="mx-5 mb-2 px-1 text-center text-[10px] leading-relaxed text-muted-foreground">
            {MATCH_FOUND_DIALOG.waitingForPeer}
          </p>
        ) : null}

        <div className="flex gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="min-h-10 w-[30%] shrink-0 cursor-pointer rounded-lg border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onConnect}
            disabled={busy || waitingForPeerConnect}
            aria-busy={busy || waitingForPeerConnect}
            className="match-found-connect-btn"
          >
            {waitingForPeerConnect ? (
              <span className="inline-flex max-w-full items-center justify-center gap-1.5">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary-foreground/80" strokeWidth={2.5} aria-hidden />
                <span className="truncate">Waiting for them</span>
              </span>
            ) : busy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary-foreground/80" strokeWidth={2.5} aria-hidden />
                Connect
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Video className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                Connect
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onCancelSearch}
          disabled={busy}
          className="mx-auto mb-3 block cursor-pointer text-[10px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel search
        </button>
      </DialogContent>
    </Dialog>
  );
}
