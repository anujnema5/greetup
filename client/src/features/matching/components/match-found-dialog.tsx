"use client";

import { useEffect, useState } from "react";
import { Loader2, Video, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useGetMatchPeerPreviewQuery } from "../api/matching-api";

const GOLD = "oklch(86% 0.11 105)";
const GOLD_BORDER = "oklch(78% 0.1 105 / 0.55)";
const PURPLE_AVATAR = "#6344E3";

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
  const { data: peer, isFetching } = useGetMatchPeerPreviewQuery(peerUserId ?? "", {
    skip: skipQuery,
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

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-220"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className={cn(
          "z-220",
          "max-w-[min(100%-1.5rem,360px)] gap-0 overflow-hidden rounded-2xl border border-zinc-800/90 p-0 shadow-2xl",
          "bg-[#121210] text-zinc-100 sm:max-w-[360px]",
        )}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Match found with {displayName}</DialogTitle>

        <div className="flex flex-col items-center px-5 pt-5 pb-4">
          <div
            className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ borderColor: GOLD_BORDER, color: GOLD }}
          >
            Match Found
          </div>

          <div className="relative mb-2.5">
            <div
              className="flex size-20 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white shadow-lg sm:size-21 sm:text-xl"
              style={
                image
                  ? { boxShadow: `0 0 40px ${PURPLE_AVATAR}55, inset 0 1px 0 oklch(100% 0 0 / 0.12)` }
                  : {
                    background: `radial-gradient(circle at 35% 30%, oklch(58% 0.22 285), ${PURPLE_AVATAR})`,
                    boxShadow: `0 0 40px ${PURPLE_AVATAR}55, inset 0 1px 0 oklch(100% 0 0 / 0.12)`,
                  }
              }
            >
              {isFetching ? (
                <span className="size-6 animate-pulse rounded-md bg-white/20" />
              ) : image ? (
                <img src={image} alt={displayName} className="size-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {online && (
              <span
                className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-[#121210] bg-emerald-500"
                title="Online"
              />
            )}
          </div>

          <h2 className="max-w-full truncate px-1 text-center text-base font-bold tracking-tight text-white sm:text-[1.05rem]">
            {displayName}
          </h2>
          {headline ? (
            <p className="mt-1 max-w-[280px] text-center text-[12px] leading-snug text-zinc-500">{headline}</p>
          ) : (
            <p className="mt-1 text-center text-[12px] text-zinc-600">New connection</p>
          )}

          {isFallbackMatch && (
            <p className="mt-2 text-center text-[10px] text-zinc-500">
              Relaxed match — fewer filters than usual.
            </p>
          )}
        </div>

        {scorePct != null && (
          <div className="mx-5 mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                <Zap className="size-3 shrink-0" style={{ color: GOLD }} strokeWidth={2.2} />
                Shared interests
              </span>
              <span className="text-xs font-bold tabular-nums" style={{ color: GOLD }}>
                {scorePct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${scorePct}%`,
                  background: `linear-gradient(90deg, ${GOLD}, oklch(90% 0.14 95))`,
                  boxShadow: `0 0 12px ${GOLD}66`,
                }}
              />
            </div>
          </div>
        )}

        {insight && (
          <div
            className={cn(
              "mx-5 mb-3 rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-center text-[11px] leading-snug text-zinc-300 transition-all duration-500",
              showInsight ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none",
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
                className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
              >
                {t}
              </span>
            ))}
            {moreCount > 0 && (
              <span className="rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                +{moreCount} more
              </span>
            )}
          </div>
        )}

        {waitingForPeerConnect ? (
          <p className="mx-5 mb-2 px-1 text-center text-[10px] leading-relaxed text-zinc-500">
            You chose Connect. The room opens when they connect too — hang tight.
          </p>
        ) : null}

        <div className="flex gap-2 border-t border-zinc-800/80 bg-zinc-950/30 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="min-h-10 w-[30%] shrink-0 cursor-pointer rounded-lg border border-zinc-600/70 bg-zinc-900/40 px-2 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={onConnect}
            disabled={busy || waitingForPeerConnect}
            aria-busy={busy || waitingForPeerConnect}
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-[11px] font-semibold text-zinc-950 transition-opacity hover:opacity-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-70"
            style={{
              background: `linear-gradient(180deg, oklch(92% 0.13 105), ${GOLD})`,
              boxShadow: `0 0 20px oklch(86% 0.11 105 / 0.3), 0 3px 10px oklch(86% 0.11 105 / 0.18)`,
            }}
          >
            {waitingForPeerConnect ? (
              <span className="inline-flex max-w-full items-center justify-center gap-1.5">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-zinc-950/80" strokeWidth={2.5} aria-hidden />
                <span className="truncate">Waiting for them</span>
              </span>
            ) : busy ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 shrink-0 animate-spin text-zinc-950/80" strokeWidth={2.5} aria-hidden />
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
          className="mx-auto mb-3 block cursor-pointer text-[10px] text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel search
        </button>
      </DialogContent>
    </Dialog>
  );
}
