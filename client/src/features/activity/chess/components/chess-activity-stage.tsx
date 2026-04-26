"use client";

import * as React from "react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import Image from "next/image";
import { useRoomChessMoveMutation } from "@/features/activity";
import {
  RoomActivityLayout,
  RoomActivityVideoTiles,
} from "@/features/room/components/room-activity/room-activity-layout";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { cn } from "@/lib/utils";
import type { RoomChessActivityState } from "@/lib/redux/types/room-slice.types";

/** React 19 — `useEffectEvent` types may lag; runtime provides the hook. */
const useEffectEvent = React.useEffectEvent as <T extends (...args: never[]) => unknown>(fn: T) => T;

export type ChessActivityStageProps = {
  peerLabel: string;
  myName: string;
  currentUserId: string | null;
  peerInitials: string;
  chessActivity: RoomChessActivityState | null;
  onEndGame?: () => void;
  onOfferDraw?: () => void;
  remoteVideoLive?: boolean;
  localVideoLive?: boolean;
  remoteStream?: MediaStream | null;
  localStream?: MediaStream | null;
};

/** Walnut / cream — high contrast, reads well on video backgrounds. */
const BOARD_COLORS = {
  light: "#f2ece4",
  dark: "#6e5f4f",
} as const;

const PRIMARY_RING = "oklch(52% 0.085 102 / 0.88)";
const PRIMARY_RING_SOFT = "oklch(52% 0.085 102 / 0.22)";

/** Selected piece — crisp inner ring + soft outer halo. */
const SELECTED_SQUARE_STYLE: CSSProperties = {
  boxShadow: `inset 0 0 0 2px ${PRIMARY_RING}, inset 0 0 0 6px ${PRIMARY_RING_SOFT}`,
};

/** Quiet moves — black disk on every square (opacity so it reads on light + dark tiles). */
const QUIET_MOVE_DOT_STYLE: CSSProperties = {
  background:
    "radial-gradient(circle, rgb(0 0 0 / 0.34) 0%, rgb(0 0 0 / 0.34) 20.5%, transparent 21.5%)",
};

/** Captures — destructive hue, layered inset + vignette (no harsh flat red). */
const CAPTURE_TARGET_STYLE: CSSProperties = {
  background:
    "radial-gradient(circle at 50% 50%, oklch(58% 0.17 25 / 0.22) 0%, oklch(52% 0.16 25 / 0.08) 52%, transparent 72%)",
  boxShadow:
    "inset 0 0 0 2.5px oklch(54% 0.19 25 / 0.78), inset 0 0 24px oklch(48% 0.18 25 / 0.14)",
};

/** Post-capture acknowledgment — brief, soft pulse-friendly rim. */
const CAPTURE_FLASH_STYLE: CSSProperties = {
  background: "oklch(58% 0.14 25 / 0.12)",
  boxShadow: "inset 0 0 0 3px oklch(56% 0.18 25 / 0.55), inset 0 0 32px oklch(50% 0.16 25 / 0.08)",
};

const DROP_SQUARE_STYLE: CSSProperties = {
  boxShadow: `inset 0 0 0 2.5px ${PRIMARY_RING}, inset 0 0 12px ${PRIMARY_RING_SOFT}`,
};

const BOARD_FRAME_STYLE: CSSProperties = {
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: `
    0 0 0 1px oklch(40% 0.04 102 / 0.28),
    0 1px 2px oklch(0% 0 0 / 0.05),
    0 10px 36px oklch(0% 0 0 / 0.22),
    0 24px 64px oklch(0% 0 0 / 0.12)
  `,
  width: "100%",
  height: "100%",
};

const CHESS_PIECE_SVGS = {
  wP: "https://lichess1.org/assets/piece/maestro/wP.svg",
  wR: "https://lichess1.org/assets/piece/maestro/wR.svg",
  wN: "https://lichess1.org/assets/piece/maestro/wN.svg",
  wB: "https://lichess1.org/assets/piece/maestro/wB.svg",
  wQ: "https://lichess1.org/assets/piece/maestro/wQ.svg",
  wK: "https://lichess1.org/assets/piece/maestro/wK.svg",
  bP: "https://lichess1.org/assets/piece/maestro/bP.svg",
  bR: "https://lichess1.org/assets/piece/maestro/bR.svg",
  bN: "https://lichess1.org/assets/piece/maestro/bN.svg",
  bB: "https://lichess1.org/assets/piece/maestro/bB.svg",
  bQ: "https://lichess1.org/assets/piece/maestro/bQ.svg",
  bK: "https://lichess1.org/assets/piece/maestro/bK.svg",
} as const;

const CUSTOM_PIECES = Object.fromEntries(
  Object.entries(CHESS_PIECE_SVGS).map(([piece, src]) => [
    piece,
    (props?: { svgStyle?: CSSProperties }) => (
      <Image
        src={src}
        alt={piece}
        width={32}
        height={32}
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-contain"
        style={props?.svgStyle}
      />
    ),
  ]),
);

function PlayerBar({
  name,
  isWhite,
  isActive,
}: {
  name: string;
  isWhite: boolean;
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-200",
        "max-md:gap-2 max-md:rounded-lg max-md:px-2.5 max-md:py-2",
        isActive
          ? "bg-card/90 shadow-[0_1px_3px_oklch(0%_0_0_/0.06)] ring-1 ring-primary/18"
          : "bg-muted/15 ring-1 ring-transparent",
      )}
    >
      <div
        className="h-4 w-4 shrink-0 rounded-[3px] border shadow-[0_1px_2px_oklch(0%_0_0_/0.06)]"
        style={{
          backgroundColor: isWhite ? BOARD_COLORS.light : BOARD_COLORS.dark,
          borderColor: isWhite ? "oklch(78% 0.02 100 / 0.55)" : "oklch(28% 0.02 100 / 0.45)",
        }}
      />
      <span
        className={cn(
          "flex-1 truncate text-sm font-semibold",
          isActive ? "text-foreground" : "text-muted-foreground/60",
        )}
      >
        {name}
      </span>
      {isActive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Turn
        </span>
      ) : (
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground/40">Waiting</span>
      )}
    </div>
  );
}

/**
 * Direct-room chess: board + videos (mobile), match/score/moves/actions in the activity rail
 * or narrow scroll footer. Moves sync through `useRoomChessMoveMutation`.
 */
export function ChessActivityStage({
  peerLabel,
  myName,
  currentUserId,
  peerInitials,
  chessActivity,
  onEndGame,
  onOfferDraw,
  remoteVideoLive = false,
  localVideoLive = false,
  remoteStream = null,
  localStream = null,
}: ChessActivityStageProps) {
  const [submitMove, { isLoading: moveSubmitting }] = useRoomChessMoveMutation();
  /** Square of the piece “lifted” for a move (highlights + legal targets). */
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [syncedMoves, setSyncedMoves] = useState<string[]>([]);
  const [captureFlashSquare, setCaptureFlashSquare] = useState<string | null>(null);

  const fen = chessActivity?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const game = useMemo(() => new Chess(fen), [fen]);
  const iPlayWhite = currentUserId != null ? chessActivity?.whiteUserId === currentUserId : true;
  const myColor: "w" | "b" = iPlayWhite ? "w" : "b";
  const boardOrientation = iPlayWhite ? "white" : "black";
  const myTurn = game.turn() === myColor;

  const movePairs = useMemo(
    () =>
      Array.from({ length: Math.ceil(syncedMoves.length / 2) }, (_, i) => ({
        n: i + 1,
        white: syncedMoves[i * 2],
        black: syncedMoves[i * 2 + 1],
      })),
    [syncedMoves],
  );

  const resetLocalBoardState = useEffectEvent(() => {
    setSyncedMoves([]);
    setSelectedSquare(null);
    setCaptureFlashSquare(null);
  });

  useEffect(() => {
    resetLocalBoardState();
  }, [chessActivity?.gameId]);

  const appendSyncedMoveFromActivity = useEffectEvent(() => {
    const lastSan = chessActivity?.lastMoveSan;
    if (!lastSan) return;
    const moveNumber = chessActivity?.moveNumber ?? 0;
    setSyncedMoves((prev) => {
      if (prev.length >= moveNumber) return prev;
      return [...prev, lastSan];
    });
  });

  useEffect(() => {
    appendSyncedMoveFromActivity();
  }, [chessActivity?.moveNumber, chessActivity?.lastMoveSan]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = { ...SELECTED_SQUARE_STYLE };
      for (const move of game.moves({ square: selectedSquare as Square, verbose: true })) {
        styles[move.to] = move.captured ? { ...CAPTURE_TARGET_STYLE } : { ...QUIET_MOVE_DOT_STYLE };
      }
    }

    if (captureFlashSquare) {
      const prev = styles[captureFlashSquare];
      styles[captureFlashSquare] = { ...prev, ...CAPTURE_FLASH_STYLE };
    }

    return styles;
  }, [game, selectedSquare, captureFlashSquare]);

  const applyMove = (from: string, to: string) => {
    if (!chessActivity || !currentUserId || moveSubmitting || !myTurn) return false;
    if (from === to) return false;

    const next = new Chess(fen);
    const pieceAtFrom = next.get(from as Square);
    if (!pieceAtFrom || pieceAtFrom.color !== next.turn()) return false;

    const destRank = to[1];
    const isQueenPromotion =
      pieceAtFrom.type === "p" &&
      ((pieceAtFrom.color === "w" && destRank === "8") ||
        (pieceAtFrom.color === "b" && destRank === "1"));

    let played: Move;
    try {
      played = isQueenPromotion ? next.move({ from, to, promotion: "q" }) : next.move({ from, to });
    } catch {
      return false;
    }

    const isGameOver = next.isGameOver();
    const winnerUserId = isGameOver && next.isCheckmate() ? currentUserId : null;
    const result: "checkmate" | "stalemate" | "draw" =
      next.isCheckmate() ? "checkmate" : next.isStalemate() ? "stalemate" : "draw";

    void submitMove({
      roomId: chessActivity.roomId,
      gameId: chessActivity.gameId,
      from,
      to,
      san: played.san,
      fen: next.fen(),
      turn: next.turn(),
      isGameOver,
      winnerUserId,
      result,
    })
      .unwrap()
      .then(() => {
        if (!played.isCapture()) return;
        setCaptureFlashSquare(to);
        window.setTimeout(() => setCaptureFlashSquare(null), 560);
      })
      .catch((e: unknown) => {
        toast.error(getRtkMutationErrorMessage(e, "Could not submit chess move"));
      });

    setSelectedSquare(null);
    return true;
  };

  const handleSquareActivated = (sq: string) => {
    if (moveSubmitting || !myTurn) return;
    const piece = game.get(sq as Square);
    const from = selectedSquare;

    if (!from) {
      if (!piece || piece.color !== myColor) return;
      setSelectedSquare(sq);
      return;
    }
    if (from === sq) {
      setSelectedSquare(null);
      return;
    }
    if (piece?.color === myColor) {
      setSelectedSquare(sq);
      return;
    }
    if (!applyMove(from, sq)) setSelectedSquare(null);
  };

  // Score card: desktop rail + mobile footer (below “Private Room”).
  const sidePanel = (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card/40 shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/25 px-3 py-2">
        <svg className="h-3.5 w-3.5 shrink-0 text-primary/80" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Score</span>
      </div>
      {[
        { label: peerLabel, score: 1, leading: true },
        { label: "You", score: 0, leading: false },
      ].map(({ label, score, leading }, i) => (
        <div
          key={label}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 text-sm",
            i > 0 && "border-t border-border/35",
          )}
        >
          <span className={cn("font-medium", leading ? "text-foreground" : "text-muted-foreground")}>
            {label}
          </span>
          <span
            className={cn(
              "rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums",
              leading ? "bg-primary/14 text-primary ring-1 ring-primary/15" : "bg-muted/50 text-muted-foreground",
            )}
          >
            {score}
          </span>
        </div>
      ))}
    </div>
  );

  const movesPanel = (
    <div className="flex max-h-52 min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/40 shadow-sm sm:max-h-56 md:max-h-none md:flex-1">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 bg-muted/25 px-3 py-2 max-md:px-2 max-md:py-1.5">
        <svg
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Moves</span>
        {syncedMoves.length > 0 && (
          <span className="ml-auto rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {syncedMoves.length}
          </span>
        )}
      </div>
      {movePairs.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-3 py-4 text-xs text-muted-foreground/55 max-md:py-1.5 max-md:text-[11px]">
          No moves yet
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {movePairs.map(({ n, white, black }, idx) => (
            <div
              key={n}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs transition-colors",
                idx === movePairs.length - 1
                  ? "bg-primary/8 ring-1 ring-inset ring-primary/10"
                  : "even:bg-muted/6 hover:bg-muted/12",
              )}
            >
              <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground/45">{n}.</span>
              <span className="w-11 shrink-0 text-foreground">{white}</span>
              <span className="min-w-10 text-muted-foreground">{black ?? ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const chessMetaColumn = (
    <>
      <div className="rounded-xl border border-border/45 bg-linear-to-br from-muted/30 via-card/80 to-card/60 px-3 py-2.5 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Match</p>
        <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
          {myTurn ? "Your move" : `${peerLabel} to move`}
        </p>
      </div>

      <PlayerBar name={peerLabel} isWhite={!iPlayWhite} isActive={!myTurn} />
      <PlayerBar name={myName} isWhite={iPlayWhite} isActive={myTurn} />

      {movesPanel}

      <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-border/40 bg-card/60 p-2 shadow-sm sm:gap-2">
        <button
          type="button"
          onClick={onEndGame}
          className="cursor-pointer rounded-lg bg-destructive/12 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/18 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
        >
          Resign
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-xs font-semibold text-foreground/90 transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={onOfferDraw}
        >
          Offer draw
        </button>
      </div>
    </>
  );

  return (
    <RoomActivityLayout
      title={undefined}
      subtitle={undefined}
      peerLabel={peerLabel}
      myName={myName}
      peerInitials={peerInitials}
      remoteVideoLive={remoteVideoLive}
      localVideoLive={localVideoLive}
      remoteStream={remoteStream}
      localStream={localStream}
      narrowVideosSideBySide
      omitNarrowRailVideos
      narrowScrollFooter={chessMetaColumn}
      sidePanel={sidePanel}
    >
      <div className="flex w-full min-w-0 flex-col overflow-x-hidden md:h-full md:min-h-0 md:flex-1 md:flex-row md:gap-3 md:overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 flex-col gap-1.5 overflow-x-hidden md:min-h-0 md:flex-1 md:flex-row md:gap-3 md:overflow-hidden">
          <div className="relative flex min-h-0 min-w-0 shrink-0 items-center justify-center overflow-x-hidden px-0 py-0 max-md:w-full md:min-w-0 md:flex-1 md:overflow-hidden">
            <div
              className={cn(
                "rounded-[14px] p-[3px] shadow-[0_0_0_1px_oklch(40%_0.04_102_/0.12)]",
                "aspect-square max-h-full max-w-full",
                "max-md:w-full max-md:max-w-full",
                "sm:max-w-md",
                "md:h-full md:max-h-full md:w-auto md:max-w-full",
              )}
            >
              <Chessboard
                options={{
                  position: fen,
                  boardOrientation,
                  onPieceDrop: ({ sourceSquare, targetSquare }) =>
                    targetSquare ? applyMove(sourceSquare, targetSquare) : false,
                  onSquareClick: ({ square }) => handleSquareActivated(square),
                  pieces: CUSTOM_PIECES,
                  squareStyles,
                  darkSquareStyle: { backgroundColor: BOARD_COLORS.dark },
                  lightSquareStyle: { backgroundColor: BOARD_COLORS.light },
                  showNotation: false,
                  alphaNotationStyle: { display: "none" },
                  numericNotationStyle: { display: "none" },
                  dropSquareStyle: DROP_SQUARE_STYLE,
                  darkSquareNotationStyle: { color: "oklch(90% 0.012 102)", fontSize: "10px", fontWeight: "600" },
                  lightSquareNotationStyle: { color: "oklch(36% 0.03 102)", fontSize: "10px", fontWeight: "600" },
                  boardStyle: BOARD_FRAME_STYLE,
                  allowDragging: !game.isGameOver() && myTurn && !moveSubmitting,
                }}
              />
            </div>
          </div>

          <div className="relative z-0 flex w-full min-w-0 flex-none flex-col overflow-hidden md:hidden">
            <div className="box-border flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl border border-border/70 bg-card/70 p-1 max-md:h-[min(34vw,28dvh,12rem)] max-md:min-h-29">
              <RoomActivityVideoTiles
                peerLabel={peerLabel}
                myName={myName}
                peerInitials={peerInitials}
                remoteVideoLive={remoteVideoLive}
                localVideoLive={localVideoLive}
                remoteStream={remoteStream}
                localStream={localStream}
                narrowVideosSideBySide
                fillAvailableOnNarrow
                narrowEmphasizePeer
                className="min-h-0 h-full w-full flex-1"
              />
            </div>
          </div>
        </div>

        <aside className="hidden min-h-0 w-52 shrink-0 flex-col gap-2 rounded-xl border border-border/50 bg-card/45 p-2 shadow-sm backdrop-blur-[2px] supports-backdrop-filter:bg-card/35 sm:gap-2.5 sm:p-2.5 md:flex md:h-full md:overflow-y-auto">
          {chessMetaColumn}
        </aside>
      </div>
    </RoomActivityLayout>
  );
}
