"use client";

import type { RefObject } from "react";
import { cn } from "@/lib/utils";

const CHESS_BOARD_ROWS = [
  ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
  ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, "wp", null, null, null],
  [null, null, null, null, null, "wn", null, null],
  ["wp", "wp", "wp", "wp", null, "wp", "wp", "wp"],
  ["wr", "wn", "wb", "wq", "wk", "wb", null, "wr"],
] as const;

const CHESS_PIECE_TEXT: Record<string, string> = {
  wp: "P",
  wr: "R",
  wn: "N",
  wb: "B",
  wq: "Q",
  wk: "K",
  bp: "P",
  br: "R",
  bn: "N",
  bb: "B",
  bq: "Q",
  bk: "K",
};

export type ChessActivityStageProps = {
  peerLabel: string;
  myName: string;
  peerInitials: string;
  remoteVideoLive: boolean;
  localVideoLive: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  localVideoRef: RefObject<HTMLVideoElement | null>;
};

export function ChessActivityStage({
  peerLabel,
  myName,
  peerInitials,
  remoteVideoLive,
  localVideoLive,
  remoteVideoRef,
  localVideoRef,
}: ChessActivityStageProps) {
  return (
    <div className="absolute inset-0 grid grid-cols-1 gap-3 bg-linear-to-br from-background/92 via-background/95 to-card/85 p-3 md:grid-cols-[13rem_minmax(0,1fr)] md:p-4">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="rounded-xl border border-border/70 bg-card/75 p-2">
          <p className="truncate text-sm font-semibold text-foreground">Private Room</p>
          <p className="text-xs text-muted-foreground">Connected</p>
        </div>
        <div className="flex min-h-0 flex-col gap-2 rounded-xl border border-border/70 bg-card/70 p-2">
          <div className="overflow-hidden rounded-lg border border-border/60 bg-black/55">
            {remoteVideoLive ? (
              <video ref={remoteVideoRef} playsInline autoPlay className="h-24 w-full object-cover" />
            ) : (
              <div className="flex h-24 items-center justify-center text-xl font-semibold text-white/90">
                {peerInitials}
              </div>
            )}
            <p className="px-2 py-1 text-xs font-medium text-white/85">{peerLabel}</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-black/55">
            {localVideoLive ? (
              <video
                ref={localVideoRef}
                playsInline
                autoPlay
                muted
                className="h-24 w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="flex h-24 items-center justify-center text-xl font-semibold text-white/90">
                {myName.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="px-2 py-1 text-xs font-medium text-white/85">You</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/75 px-2 py-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Score</p>
            <div className="mt-1 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground">{peerLabel}</span>
                <span className="font-semibold text-primary">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">You</span>
                <span className="font-semibold text-primary">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-card/65 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Chess</p>
            <p className="text-xs text-muted-foreground">Your move</p>
          </div>
          <span className="rounded-full border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            03:42
          </span>
        </div>
        <div className="mx-auto w-full max-w-108 rounded-xl border border-border/80 bg-background/95 p-2 shadow-lg">
          <div className="grid grid-cols-8 overflow-hidden rounded-md border border-border/60">
            {CHESS_BOARD_ROWS.flatMap((row, rowIndex) =>
              row.map((piece, colIndex) => {
                const darkSquare = (rowIndex + colIndex) % 2 === 1;
                const isActiveSquare = rowIndex === 4 && colIndex === 4;
                const isTargetSquare = rowIndex === 5 && colIndex === 5;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      "flex aspect-square items-center justify-center text-sm font-semibold md:text-base",
                      darkSquare
                        ? "bg-[oklch(40%_0.05_70)] text-white/85"
                        : "bg-[oklch(83%_0.03_80)] text-[oklch(22%_0.02_110)]",
                      isActiveSquare && "bg-primary/80 text-white",
                      isTargetSquare && "ring-2 ring-primary/60 ring-inset",
                    )}
                  >
                    {piece ? CHESS_PIECE_TEXT[piece] : null}
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-border bg-background/85 px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Resign
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-background/85 px-4 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Draw
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            Moves
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{myName}</span>
          <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
            04:15
          </span>
        </div>
      </div>
    </div>
  );
}
