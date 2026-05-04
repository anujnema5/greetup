/**
 * In-call chess UI: board, move list, and layout shell.
 *
 * Structure (top → bottom): static board styles → piece renderers → `PlayerBar` → `ChessActivityStage`.
 * Performance notes are short comments next to the code they refer to.
 */
"use client";

import * as React from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Chess, type Move, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useRoomChessMoveMutation } from "@/features/activity";
import { capturedPieceKeysFromSans, type ChessPieceKey } from "@/features/activity/chess/utils/chess-captured";
import { playChessSound, preloadChessSounds } from "@/features/activity/chess/utils/chess-sounds";
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
  remoteMicOff?: boolean;
  remoteCameraOff?: boolean;
  micEnabled?: boolean;
  cameraEnabled?: boolean;
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

// Reused in `boardOptions` so react-chessboard doesn’t see new style objects every render.
const BOARD_DARK_SQUARE_STYLE: CSSProperties = { backgroundColor: BOARD_COLORS.dark };
const BOARD_LIGHT_SQUARE_STYLE: CSSProperties = { backgroundColor: BOARD_COLORS.light };
const NOTATION_HIDDEN_STYLE: CSSProperties = { display: "none" };
const DARK_NOTATION_LABEL_STYLE: CSSProperties = {
  color: "oklch(90% 0.012 102)",
  fontSize: "10px",
  fontWeight: "600",
};
const LIGHT_NOTATION_LABEL_STYLE: CSSProperties = {
  color: "oklch(36% 0.03 102)",
  fontSize: "10px",
  fontWeight: "600",
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

const ChessboardPieceImg = memo(function ChessboardPieceImg({
  src,
  svgStyle,
}: {
  src: string;
  svgStyle?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- board pieces: native img for perf
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      draggable={false}
      decoding="async"
      fetchPriority="low"
      className="pointer-events-none h-full w-full select-none object-contain"
      style={svgStyle}
    />
  );
});

const CUSTOM_PIECES = Object.fromEntries(
  Object.entries(CHESS_PIECE_SVGS).map(([piece, src]) => [
    piece,
    (props?: { svgStyle?: CSSProperties }) => (
      <ChessboardPieceImg src={src} svgStyle={props?.svgStyle} />
    ),
  ]),
);

const PlayerBar = memo(function PlayerBar({
  name,
  isWhite,
  isActive,
  captures,
}: {
  name: string;
  isWhite: boolean;
  isActive: boolean;
  captures: ChessPieceKey[];
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-1.5 rounded-xl px-3 py-2.5 transition-all duration-200",
        "max-md:gap-1 max-md:rounded-lg max-md:px-2.5 max-md:py-2",
        isActive
          ? "bg-card/90 shadow-[0_1px_3px_oklch(0%_0_0_/0.06)] ring-1 ring-primary/18"
          : "bg-muted/15 ring-1 ring-transparent",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 max-md:gap-2">
        <div
          className="h-4 w-4 shrink-0 rounded-[3px] border shadow-[0_1px_2px_oklch(0%_0_0_/0.06)]"
          style={{
            backgroundColor: isWhite ? BOARD_COLORS.light : BOARD_COLORS.dark,
            borderColor: isWhite ? "oklch(78% 0.02 100 / 0.55)" : "oklch(28% 0.02 100 / 0.45)",
          }}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-semibold",
            isActive ? "text-foreground" : "text-muted-foreground/60",
          )}
        >
          {name}
        </span>
        {isActive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/12 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              {/* Ping only on `md+` — continuous animation is costly on low-end phones. */}
              <span className="absolute hidden h-full w-full animate-ping rounded-full bg-primary/60 opacity-70 md:inline-flex" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Turn
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground/40">Waiting</span>
        )}
      </div>
      {captures.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-x-0.5 gap-y-0.5 border-t border-border/25 pt-1.5 max-md:pt-1"
          aria-label={`${name} captured pieces`}
        >
          <span className="w-full text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Captured
          </span>
          <div className="flex flex-wrap gap-0.5">
            {captures.map((key, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- small SVG URLs, many instances
              <img
                key={`${key}-${i}`}
                src={CHESS_PIECE_SVGS[key]}
                alt=""
                width={22}
                height={22}
                decoding="async"
                className="h-[22px] w-[22px] shrink-0 object-contain opacity-90 drop-shadow-sm max-md:h-[18px] max-md:w-[18px]"
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});

/** Replays `sans` in order and returns the last `Move`, or `null` if any SAN is illegal. */
function lastMoveFromSanList(sans: string[]): Move | null {
  if (sans.length === 0) return null;
  const board = new Chess();
  for (let i = 0; i < sans.length - 1; i++) {
    if (!board.move(sans[i]!)) return null;
  }
  return board.move(sans[sans.length - 1]!);
}

/**
 * Mobile: board + video strip + scroll footer. Desktop: board + right column (match / moves).
 * Moves: REST (`useRoomChessMoveMutation`) + Redux/socket keeping `chessActivity` in sync.
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
  remoteMicOff = false,
  remoteCameraOff = false,
  micEnabled = true,
  cameraEnabled = true,
}: ChessActivityStageProps) {
  const [submitMove, { isLoading: moveSubmitting }] = useRoomChessMoveMutation();
  /** Square of the piece “lifted” for a move (highlights + legal targets). */
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [syncedMoves, setSyncedMoves] = useState<string[]>([]);
  const [captureFlashSquare, setCaptureFlashSquare] = useState<string | null>(null);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  /** How many entries in `syncedMoves` we’ve already played sound / flash for. */
  const prevSyncedMoveCountRef = useRef(0);

  const fen = chessActivity?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const game = useMemo(() => new Chess(fen), [fen]);
  const iPlayWhite = currentUserId != null ? chessActivity?.whiteUserId === currentUserId : true;
  const myColor: "w" | "b" = iPlayWhite ? "w" : "b";
  const boardOrientation: "white" | "black" = iPlayWhite ? "white" : "black";
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

  const { capturedByWhite, capturedByBlack } = useMemo(
    () => capturedPieceKeysFromSans(syncedMoves),
    [syncedMoves],
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsNarrowViewport(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    preloadChessSounds();
  }, []);

  const resetLocalBoardState = useEffectEvent(() => {
    setSyncedMoves([]);
    setSelectedSquare(null);
    setCaptureFlashSquare(null);
  });

  useEffect(() => {
    resetLocalBoardState();
    prevSyncedMoveCountRef.current = 0;
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

  // New half-move in `syncedMoves` → sound + optional capture flash (same logic for local + remote).
  useEffect(() => {
    const len = syncedMoves.length;
    const prev = prevSyncedMoveCountRef.current;
    if (len <= prev) {
      if (len === 0) prevSyncedMoveCountRef.current = 0;
      return;
    }

    const played = lastMoveFromSanList(syncedMoves);
    if (!played) {
      prevSyncedMoveCountRef.current = len;
      return;
    }

    playChessSound(played.captured ? "capture" : "move");
    if (played.captured) {
      const sq = played.to;
      window.requestAnimationFrame(() => {
        setCaptureFlashSquare(sq);
        window.setTimeout(() => setCaptureFlashSquare(null), 560);
      });
    }
    prevSyncedMoveCountRef.current = len;
  }, [syncedMoves]);

  // Selection highlights: split from capture flash so we don’t re-run `game.moves()` every flash tick.
  const selectionSquareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (!selectedSquare) return styles;
    styles[selectedSquare] = { ...SELECTED_SQUARE_STYLE };
    for (const move of game.moves({ square: selectedSquare as Square, verbose: true })) {
      styles[move.to] = move.captured ? { ...CAPTURE_TARGET_STYLE } : { ...QUIET_MOVE_DOT_STYLE };
    }
    return styles;
  }, [game, selectedSquare]);

  const squareStyles = useMemo((): Record<string, CSSProperties> => {
    if (!captureFlashSquare) return selectionSquareStyles;
    return {
      ...selectionSquareStyles,
      [captureFlashSquare]: {
        ...selectionSquareStyles[captureFlashSquare],
        ...CAPTURE_FLASH_STYLE,
      },
    };
  }, [selectionSquareStyles, captureFlashSquare]);

  const applyMove = useCallback(
    (from: string, to: string) => {
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
        .catch((e: unknown) => {
          toast.error(getRtkMutationErrorMessage(e, "Could not submit chess move"));
        });

      setSelectedSquare(null);
      return true;
    },
    [chessActivity, currentUserId, fen, moveSubmitting, myTurn, submitMove],
  );

  const handleSquareActivated = useCallback(
    (sq: string) => {
      if (moveSubmitting || !myTurn) return;
      setSelectedSquare((from) => {
        const piece = game.get(sq as Square);

        if (!from) {
          if (!piece || piece.color !== myColor) return null;
          return sq;
        }
        if (from === sq) return null;
        if (piece?.color === myColor) return sq;
        if (!applyMove(from, sq)) return null;
        return null;
      });
    },
    [applyMove, game, moveSubmitting, myColor, myTurn],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
      targetSquare ? applyMove(sourceSquare, targetSquare) : false,
    [applyMove],
  );

  const boardOptions = useMemo(
    () => ({
      id: "circlo-chess-board",
      position: fen,
      boardOrientation,
      onPieceDrop,
      onSquareClick: ({ square }: { square: string }) => handleSquareActivated(square),
      pieces: CUSTOM_PIECES,
      squareStyles,
      darkSquareStyle: BOARD_DARK_SQUARE_STYLE,
      lightSquareStyle: BOARD_LIGHT_SQUARE_STYLE,
      showNotation: false,
      alphaNotationStyle: NOTATION_HIDDEN_STYLE,
      numericNotationStyle: NOTATION_HIDDEN_STYLE,
      dropSquareStyle: DROP_SQUARE_STYLE,
      darkSquareNotationStyle: DARK_NOTATION_LABEL_STYLE,
      lightSquareNotationStyle: LIGHT_NOTATION_LABEL_STYLE,
      boardStyle: BOARD_FRAME_STYLE,
      allowDragging: !game.isGameOver() && myTurn && !moveSubmitting,
      showAnimations: !isNarrowViewport,
      animationDurationInMs: isNarrowViewport ? 0 : 180,
      dragActivationDistance: isNarrowViewport ? 6 : 3,
    }),
    [
      boardOrientation,
      fen,
      game,
      handleSquareActivated,
      isNarrowViewport,
      moveSubmitting,
      myTurn,
      onPieceDrop,
      squareStyles,
    ],
  );

  const sidePanel = useMemo(
    () => (
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
    ),
    [peerLabel],
  );

  const movesPanel = useMemo(
    () => (
      <div className="flex max-h-52 min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/40 shadow-sm sm:max-h-56 md:max-h-[min(50vh,22rem)] md:min-h-30 lg:max-h-none lg:flex-1">
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
    ),
    [movePairs, syncedMoves.length],
  );

  const chessMetaColumn = useMemo(
    () => (
      <>
        <div className="rounded-xl border border-border/45 bg-linear-to-br from-muted/30 via-card/80 to-card/60 px-3 py-2.5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Match</p>
          <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">
            {myTurn ? "Your move" : `${peerLabel} to move`}
          </p>
        </div>

        <PlayerBar
          name={peerLabel}
          isWhite={!iPlayWhite}
          isActive={!myTurn}
          captures={!iPlayWhite ? capturedByWhite : capturedByBlack}
        />
        <PlayerBar
          name={myName}
          isWhite={iPlayWhite}
          isActive={myTurn}
          captures={iPlayWhite ? capturedByWhite : capturedByBlack}
        />

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
    ),
    [
      capturedByBlack,
      capturedByWhite,
      iPlayWhite,
      movesPanel,
      myName,
      myTurn,
      onEndGame,
      onOfferDraw,
      peerLabel,
    ],
  );

  return (
    <RoomActivityLayout
      title="Chess"
      subtitle="In-call game"
      swapActivityHeaderWithRoomCard
      peerLabel={peerLabel}
      myName={myName}
      peerInitials={peerInitials}
      remoteVideoLive={remoteVideoLive}
      localVideoLive={localVideoLive}
      remoteStream={remoteStream}
      localStream={localStream}
      remoteMicOff={remoteMicOff}
      remoteCameraOff={remoteCameraOff}
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      narrowVideosSideBySide
      omitNarrowRailVideos
      narrowScrollFooter={chessMetaColumn}
      sidePanel={sidePanel}
    >
      <div className="flex w-full min-w-0 flex-col overflow-x-hidden md:h-full md:min-h-0 md:max-h-full md:flex-1 md:flex-row md:gap-3 lg:gap-4 md:overflow-hidden">
        <div className="flex min-h-0 w-full min-w-0 flex-col gap-1.5 overflow-x-hidden md:h-full md:min-h-0 md:max-h-full md:flex-1 md:flex-row md:gap-3 lg:gap-4 md:overflow-hidden">
          <div className="relative flex min-h-0 min-w-0 shrink-0 items-center justify-center overflow-x-hidden px-0 py-0 max-md:mx-auto max-md:w-full max-md:max-w-[min(100%,calc(100vw-1.25rem))] md:h-full md:min-h-0 md:min-w-0 md:flex-1 md:self-stretch md:overflow-hidden">
            <div
              className={cn(
                "rounded-[14px] p-[3px] shadow-[0_0_0_1px_oklch(40%_0.04_102_/0.12)]",
                "aspect-square max-h-full max-w-full min-h-0 min-w-0",
                "w-full max-md:max-w-full",
                "sm:mx-auto sm:max-w-[min(100%,28rem)] md:mx-0 md:h-full md:max-h-full md:max-w-full md:w-auto",
              )}
            >
              <Chessboard options={boardOptions} />
            </div>
          </div>

          <div className="relative z-0 flex w-full min-w-0 flex-none flex-col overflow-hidden md:hidden">
            <div className="box-border flex h-full min-h-0 w-full min-w-0 flex-col rounded-xl border border-border/70 bg-card/70 p-1 max-md:h-[clamp(7.25rem,min(36vw,30dvh),13.5rem)] max-md:min-h-0">
              <RoomActivityVideoTiles
                peerLabel={peerLabel}
                myName={myName}
                peerInitials={peerInitials}
                remoteVideoLive={remoteVideoLive}
                localVideoLive={localVideoLive}
                remoteStream={remoteStream}
                localStream={localStream}
                peerMicLive={!remoteMicOff}
                peerCameraLive={remoteVideoLive && !remoteCameraOff}
                localMicLive={micEnabled}
                localCameraLive={localVideoLive && cameraEnabled}
                narrowVideosSideBySide
                fillAvailableOnNarrow
                narrowEmphasizePeer
                className="min-h-0 h-full w-full flex-1"
              />
            </div>
          </div>
        </div>

        <aside
          className={cn(
            "hidden min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/45 shadow-sm backdrop-blur-[2px] supports-backdrop-filter:bg-card/35",
            "md:flex md:h-full md:max-h-full md:w-52 md:min-w-50",
            "lg:w-56 xl:min-w-60 xl:w-60",
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden overscroll-y-contain p-2 sm:gap-2.5 lg:p-2.5 [scrollbar-gutter:stable]">
            {chessMetaColumn}
          </div>
        </aside>
      </div>
    </RoomActivityLayout>
  );
}
