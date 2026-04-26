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

// Muted warm tones aligned with the app's primary hue family.
const BOARD_COLORS = {
  light: "#ece8dc",
  dark: "#8b7a62",
} as const;

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
    ({ squareWidth }: { squareWidth: number }) => (
      <img
        src={src}
        alt={piece}
        width={squareWidth}
        height={squareWidth}
        draggable={false}
        className="pointer-events-none h-full w-full select-none object-contain"
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
      className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
        isActive ? "bg-card/80 shadow-sm ring-1 ring-primary/20" : "bg-muted/10"
      }`}
    >
      <div
        className="h-4 w-4 shrink-0 rounded-sm border shadow-sm"
        style={{
          backgroundColor: isWhite ? BOARD_COLORS.light : BOARD_COLORS.dark,
          borderColor: isWhite ? "#aab3c2" : "#525c6b",
        }}
      />
      <span
        className={`flex-1 truncate text-sm font-semibold ${
          isActive ? "text-foreground" : "text-muted-foreground/60"
        }`}
      >
        {name}
      </span>
      {isActive ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Turn
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground/35">Waiting</span>
      )}
    </div>
  );
}

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
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const iPlayWhite = currentUserId != null ? chessActivity?.whiteUserId === currentUserId : true;
  const boardOrientation = iPlayWhite ? "white" : "black";
  const myTurn = (game.turn() === "w" && iPlayWhite) || (game.turn() === "b" && !iPlayWhite);
  const moveHistory = useMemo(() => game.history(), [fen]);

  const movePairs = useMemo(
    () =>
      Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => ({
        n: i + 1,
        white: moveHistory[i * 2],
        black: moveHistory[i * 2 + 1],
      })),
    [moveHistory],
  );

  const squareStyles = useMemo(() => {
    if (!selectedSquare) return {};
    const styles: Record<string, CSSProperties> = {
      [selectedSquare]: {
        boxShadow: "inset 0 0 0 4px oklch(52% 0.085 102 / 0.75)",
      },
    };
    for (const move of game.moves({ square: selectedSquare as Square, verbose: true })) {
      styles[move.to] = {
        background: "radial-gradient(circle, oklch(52% 0.085 102 / 0.45) 28%, transparent 30%)",
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

  const sidePanel = (
    <>
      {/* Score */}
      <div className="overflow-hidden rounded-lg border border-border/40">
        <div className="flex items-center gap-1.5 border-b border-border/40 bg-muted/30 px-3 py-1.5">
          <svg className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Score
          </span>
        </div>
        {[
          { label: peerLabel, score: 1, leading: true },
          { label: "You", score: 0, leading: false },
        ].map(({ label, score, leading }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between bg-card/80 px-3 py-2 text-sm ${i > 0 ? "border-t border-border/30" : ""}`}
          >
            <span className={`font-medium ${leading ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                leading
                  ? "bg-primary/20 text-primary ring-1 ring-primary/20"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {score}
            </span>
          </div>
        ))}
      </div>

      {/* Move history */}
      <div className="overflow-hidden rounded-lg border border-border/40">
        <div className="flex items-center gap-1.5 border-b border-border/40 bg-muted/30 px-3 py-1.5">
          <svg
            className="h-3 w-3 shrink-0 text-muted-foreground"
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
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Moves
          </span>
          {moveHistory.length > 0 && (
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/50">
              {moveHistory.length}
            </span>
          )}
        </div>
        {movePairs.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground/50">No moves yet</p>
        ) : (
          <div className="max-h-32 overflow-y-auto">
            {movePairs.map(({ n, white, black }) => (
              <div
                key={n}
                className="flex items-center gap-1 px-2 py-0.75 text-xs even:bg-muted/10 hover:bg-muted/20"
              >
                <span className="w-5 shrink-0 text-right font-mono tabular-nums text-muted-foreground/40">
                  {n}.
                </span>
                <span className="w-12 shrink-0 font-mono text-foreground">{white}</span>
                <span className="font-mono text-muted-foreground">{black ?? ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
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
      sidePanel={sidePanel}
    >
      <div className="flex h-full flex-col gap-1.5">
        {/* Opponent player bar */}
        <PlayerBar name={peerLabel} isWhite={!iPlayWhite} isActive={!myTurn} />

        {/* Board — fills all remaining vertical space */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1 py-0.5">
          <div className="aspect-square h-full max-h-full w-auto max-w-full">
            <Chessboard
              options={{
                position: fen,
                boardOrientation,
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  targetSquare ? applyMove(sourceSquare, targetSquare) : false,
                onSquareClick: ({ square }) => onSquareClick(square),
                pieces: CUSTOM_PIECES,
                squareStyles,
                darkSquareStyle: { backgroundColor: BOARD_COLORS.dark },
                lightSquareStyle: { backgroundColor: BOARD_COLORS.light },
                showNotation: false,
                alphaNotationStyle: { display: "none" },
                numericNotationStyle: { display: "none" },
                dropSquareStyle: { boxShadow: "inset 0 0 0 3px rgba(47, 93, 179, 0.75)" },
                darkSquareNotationStyle: { color: "oklch(90% 0.012 102)", fontSize: "10px", fontWeight: "600" },
                lightSquareNotationStyle: { color: "oklch(36% 0.03 102)", fontSize: "10px", fontWeight: "600" },
                boardStyle: {
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: "0 0 0 1px oklch(40% 0.04 102 / 0.55), 0 8px 32px rgba(0,0,0,0.4)",
                  width: "100%",
                  height: "100%",
                },
                allowDragging: !game.isGameOver(),
              }}
            />
          </div>
        </div>

        {/* My player bar */}
        <PlayerBar name={myName} isWhite={iPlayWhite} isActive={myTurn} />

        {/* Action row */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border/30 bg-muted/10 p-1">
          <button
            type="button"
            onClick={onEndGame}
            className="flex-1 rounded-md py-1.5 text-xs font-semibold text-rose-400/70 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            Resign
          </button>
          <div className="h-4 w-px shrink-0 bg-border/40" />
          <button
            type="button"
            className="flex-1 rounded-md py-1.5 text-xs font-semibold text-muted-foreground/60 transition-colors hover:bg-muted/30 hover:text-muted-foreground"
          >
            Offer Draw
          </button>
        </div>
      </div>
    </RoomActivityLayout>
  );
}
