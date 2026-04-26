"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useRoomChessMoveMutation } from "@/features/activity";
import { RoomActivityLayout } from "@/features/room/components/room-activity/room-activity-layout";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import type { RoomChessActivityState } from "@/lib/redux/types/room-slice.types";

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
    (props?: { svgStyle?: CSSProperties }) => (
      <img
        src={src}
        alt={piece}
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
  onOfferDraw,
  remoteVideoLive = false,
  localVideoLive = false,
  remoteStream = null,
  localStream = null,
}: ChessActivityStageProps) {
  const [submitMove, { isLoading: moveSubmitting }] = useRoomChessMoveMutation();
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [syncedMoves, setSyncedMoves] = useState<string[]>([]);

  const fen = chessActivity?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const game = useMemo(() => new Chess(fen), [fen]);
  const iPlayWhite = currentUserId != null ? chessActivity?.whiteUserId === currentUserId : true;
  const myColor: "w" | "b" = iPlayWhite ? "w" : "b";
  const boardOrientation = iPlayWhite ? "white" : "black";
  const myTurn = game.turn() === myColor;
  const moveHistory = syncedMoves;

  const movePairs = useMemo(
    () =>
      Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => ({
        n: i + 1,
        white: moveHistory[i * 2],
        black: moveHistory[i * 2 + 1],
      })),
    [moveHistory],
  );

  useEffect(() => {
    setSyncedMoves([]);
    setMoveFrom(null);
    setSelectedSquare(null);
  }, [chessActivity?.gameId]);

  useEffect(() => {
    const lastSan = chessActivity?.lastMoveSan;
    if (!lastSan) return;
    setSyncedMoves((prev) => {
      if (prev.length >= chessActivity.moveNumber) return prev;
      return [...prev, lastSan];
    });
  }, [chessActivity?.moveNumber, chessActivity?.lastMoveSan]);

  const squareStyles = useMemo(() => {
    if (!selectedSquare) return {};
    const styles: Record<string, CSSProperties> = {
      [selectedSquare]: { boxShadow: "inset 0 0 0 4px oklch(52% 0.085 102 / 0.75)" },
    };
    for (const move of game.moves({ square: selectedSquare as Square, verbose: true })) {
      styles[move.to] = {
        background: "radial-gradient(circle, oklch(52% 0.085 102 / 0.45) 28%, transparent 30%)",
      };
    }
    return styles;
  }, [game, selectedSquare, fen]);

  const applyMove = (from: string, to: string) => {
    if (!chessActivity || !currentUserId || moveSubmitting || !myTurn) return false;
    const next = new Chess(fen);
    const move = next.move({ from, to, promotion: "q" });
    if (!move) return false;

    const isGameOver = next.isGameOver();
    const winnerUserId = isGameOver && next.isCheckmate() ? currentUserId : null;
    const result: "checkmate" | "stalemate" | "draw" =
      next.isCheckmate() ? "checkmate" : next.isStalemate() ? "stalemate" : "draw";

    void submitMove({
      roomId: chessActivity.roomId,
      gameId: chessActivity.gameId,
      from,
      to,
      san: move.san,
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
    setMoveFrom(null);
    return true;
  };

  const onSquareClick = (sq: string) => {
    if (moveSubmitting || !myTurn) return;
    const piece = game.get(sq as Square);
    if (!moveFrom) {
      if (!piece || piece.color !== myColor) return;
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
      if (!piece || piece.color !== myColor) {
        setMoveFrom(null);
        setSelectedSquare(null);
        return;
      }
      setMoveFrom(sq);
      setSelectedSquare(sq);
    }
  };

  const sidePanel = (
    <>
      <div className="overflow-hidden rounded-lg border border-border-red-800">
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
                leading ? "bg-primary/20 text-primary ring-1 ring-primary/20" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {score}
            </span>
          </div>
        ))}
      </div>

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
      title={undefined}
      subtitle={undefined}
      peerLabel={peerLabel}
      myName={myName}
      peerInitials={peerInitials}
      remoteVideoLive={remoteVideoLive}
      localVideoLive={localVideoLive}
      remoteStream={remoteStream}
      localStream={localStream}
      sidePanel={sidePanel}
    >
      <div className="flex h-full min-h-0 gap-2">
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
                allowDragging: !game.isGameOver() && myTurn && !moveSubmitting,
              }}
            />
          </div>
        </div>

        <aside className="flex w-44 shrink-0 flex-col gap-2 rounded-lg border border-border/40 bg-card/55 p-2">
          <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Chess</p>
            <p className="mt-0.5 text-xs font-medium text-foreground">
              {myTurn ? "Your turn" : `${peerLabel}'s turn`}
            </p>
          </div>

          <PlayerBar name={peerLabel} isWhite={!iPlayWhite} isActive={!myTurn} />
          <PlayerBar name={myName} isWhite={iPlayWhite} isActive={myTurn} />

          <div className="mt-auto flex flex-col gap-1.5 rounded-md border border-border/30 bg-card/70 p-1.5">
            <button
              type="button"
              onClick={onEndGame}
              className="cursor-pointer rounded-md bg-rose-500/12 px-2 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
            >
              Resign
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-md bg-muted/35 px-2 py-1.5 text-xs font-semibold text-foreground/90 transition-colors hover:bg-muted/55 hover:text-foreground"
              onClick={onOfferDraw}
            >
              Offer Draw
            </button>
          </div>
        </aside>
      </div>
    </RoomActivityLayout>
  );
}
