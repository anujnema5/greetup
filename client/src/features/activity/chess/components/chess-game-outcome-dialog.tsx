"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { RoomChessLastOutcome } from "@/lib/redux/types/activity-slice.types";
import { buildChessOutcomePresentation } from "@/features/activity/chess/lib/chess-outcome-copy";

export type ChessGameOutcomeDialogProps = {
  open: boolean;
  outcome: RoomChessLastOutcome | null;
  myUserId: string | null;
  myDisplayName: string;
  peerDisplayName: string;
  onOpenChange: (open: boolean) => void;
  onPlayAgain: () => void;
  playAgainBusy: boolean;
};

export function ChessGameOutcomeDialog({
  open,
  outcome,
  myUserId,
  myDisplayName,
  peerDisplayName,
  onOpenChange,
  onPlayAgain,
  playAgainBusy,
}: ChessGameOutcomeDialogProps) {
  if (!outcome) return null;

  const copy = buildChessOutcomePresentation(outcome, myUserId, myDisplayName, peerDisplayName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-200 overflow-hidden p-0 sm:max-w-sm" overlayClassName="z-199">
        <div className="flex flex-col items-center gap-3 border-b border-border/40 px-6 pb-6 pt-8">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ring-1 ring-border/60",
              copy.kind === "decisive" && copy.youWon && "bg-primary/15 text-primary",
              copy.kind === "decisive" && !copy.youWon && "bg-muted text-muted-foreground",
              copy.kind === "draw" && "bg-muted text-foreground",
            )}
          >
            ♟︎
          </div>
          <div className="text-center">
            <DialogTitle className="text-lg font-semibold">{copy.headline}</DialogTitle>
            <DialogDescription className="mt-1.5 text-sm text-muted-foreground">{copy.reason}</DialogDescription>
          </div>
        </div>

        <div className="px-6 py-4">
          {copy.kind === "decisive" ? (
            <div className="space-y-2 rounded-xl border border-border/45 bg-card/50 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-primary">Winner</span>
                <span className="truncate font-semibold text-foreground">{copy.winnerName}</span>
              </div>
              <div className="border-t border-border/35" />
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Other player</span>
                <span className="truncate text-muted-foreground">{copy.loserName}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-border/45 bg-card/50 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground/80">White</span>
                <span className="truncate font-medium text-foreground">{copy.whiteName}</span>
              </div>
              <div className="border-t border-border/35" />
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground/80">Black</span>
                <span className="truncate font-medium text-foreground">{copy.blackName}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border/40 px-6 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" className="flex-1" onClick={onPlayAgain} disabled={playAgainBusy}>
            {playAgainBusy ? "Sending…" : "Play again"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
