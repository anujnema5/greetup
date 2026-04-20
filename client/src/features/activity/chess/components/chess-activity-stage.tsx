"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { RoomActivityLayout } from "@/features/room/components/room-activity/room-activity-layout";
import type { RoomChessActivityState } from "@/lib/redux/types/room-slice.types";

export type ChessActivityStageProps = {
  peerLabel: string;
  myName: string;
  currentUserId: string | null;
  peerInitials: string;
  chessActivity: RoomChessActivityState | null;
  onEndGame?: () => void;
  remoteVideoLive?: boolean;
  localVideoLive?: boolean;
  remoteStream?: MediaStream | null;
  localStream?: MediaStream | null;
};

const BOARD_COLORS = { light: "#f0d9b5", dark: "#b58863" } as const;

export function ChessActivityStage({
  peerLabel,
  myName,
  currentUserId,
  peerInitials,
  chessActivity,
  onEndGame,
  remoteVideoLive = false,
  localVideoLive = false,
  remoteStream = null,
  localStream = null,
}: ChessActivityStageProps) {
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [showMoves, setShowMoves] = useState(false);

  const iPlayWhite = currentUserId != null ? chessActivity?.whiteUserId === currentUserId : true;
  const boardOrientation = iPlayWhite ? "white" : "black";
  const myTurn = (game.turn() === "w" && iPlayWhite) || (game.turn() === "b" && !iPlayWhite);
  const moveHistory = useMemo(() => game.history(), [fen]);

  const squareStyles = useMemo(() => {
    if (!selectedSquare) return {};
    const styles: Record<string, CSSProperties> = {
      [selectedSquare]: {
        background:
          "radial-gradient(circle, rgba(59,130,246,0.4) 38%, rgba(59,130,246,0.15) 62%, transparent 65%)",
      },
    };
    for (const move of game.moves({ square: selectedSquare as Square, verbose: true })) {
      styles[move.to] = {
        background: "radial-gradient(circle, rgba(0,0,0,0.18) 26%, transparent 28%)",
      };
    }
    return styles;
  }, [game, selectedSquare, fen]);

  const applyMove = (from: string, to: string) => {
    if (!game.move({ from, to, promotion: "q" })) return false;
    setFen(game.fen());
    setSelectedSquare(null);
    setMoveFrom(null);
    return true;
  };

  const onSquareClick = (sq: string) => {
    if (!moveFrom) {
      setMoveFrom(sq);
      setSelectedSquare(sq);
      return;
    }
    if (moveFrom === sq) {
      setMoveFrom(null);
      setSelectedSquare(null);
      return;
    }
    if (!applyMove(moveFrom, sq)) {
      setMoveFrom(sq);
      setSelectedSquare(sq);
    }
  };

  const scorePanel = (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="bg-muted/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Score
      </div>
      {[
        { label: peerLabel, score: 1 },
        { label: "You", score: 0 },
      ].map(({ label, score }, i) => (
        <div
          key={label}
          className={`flex items-center justify-between bg-card px-3 py-2 text-sm text-foreground ${i > 0 ? "border-t border-border/50" : ""}`}
        >
          <span>{label}</span>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {score}
          </span>
        </div>
      ))}
    </div>
  );

  const actionButtons = (
    <>
      {[
        { label: "Resign", action: onEndGame },
        { label: "Draw", action: () => {} },
        { label: "Moves", action: () => setShowMoves((v) => !v) },
      ].map(({ label, action }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          className="rounded-md border border-border/60 bg-secondary/60 px-5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {label}
        </button>
      ))}
    </>
  );

  const turnFooter = (
    <span
      className={`rounded-md px-3 py-1 text-xs font-medium tabular-nums ${
        myTurn
          ? "bg-primary text-primary-foreground"
          : "border border-border/60 bg-muted/40 text-muted-foreground"
      }`}
    >
      {myTurn ? "Your turn" : `${peerLabel}'s turn`}
    </span>
  );

  return (
    <RoomActivityLayout
      title="Chess"
      subtitle={myTurn ? "Your turn" : `${peerLabel}'s turn`}
      peerLabel={peerLabel}
      myName={myName}
      peerInitials={peerInitials}
      remoteVideoLive={remoteVideoLive}
      localVideoLive={localVideoLive}
      remoteStream={remoteStream}
      localStream={localStream}
      sidePanel={scorePanel}
      actions={actionButtons}
      footer={turnFooter}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div className="aspect-square min-h-0 max-h-full w-auto max-w-full">
          <Chessboard
            options={{
              position: fen,
              boardOrientation,
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                targetSquare ? applyMove(sourceSquare, targetSquare) : false,
              onSquareClick: ({ square }) => onSquareClick(square),
              squareStyles,
              darkSquareStyle: { backgroundColor: BOARD_COLORS.dark },
              lightSquareStyle: { backgroundColor: BOARD_COLORS.light },
              boardStyle: {
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                width: "100%",
                height: "100%",
              },
              allowDragging: !game.isGameOver(),
            }}
          />
        </div>
      </div>

      {showMoves && (
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          {moveHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">No moves yet.</p>
          ) : (
            <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
              {moveHistory.map((m, i) => (
                <span
                  key={`${m}-${i}`}
                  className="rounded bg-muted/60 px-1.5 py-0.5 text-xs text-foreground"
                >
                  {i + 1}. {m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </RoomActivityLayout>
  );
}
