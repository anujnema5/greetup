import { Chess, type Move } from "chess.js";

/** Lichess piece asset keys, e.g. `wP`, `bQ`. */
export type ChessPieceKey = `${"w" | "b"}${"P" | "N" | "B" | "R" | "Q"}`;

const PIECE_ORDER: Record<string, number> = { Q: 5, R: 4, B: 3, N: 2, P: 1 };

const STARTING_COUNTS = { P: 8, N: 2, B: 2, R: 2, Q: 1 } as const;

function victimKey(color: "w" | "b", capturedType: string): ChessPieceKey | null {
  const t = capturedType.toUpperCase();
  if (t !== "P" && t !== "N" && t !== "B" && t !== "R" && t !== "Q") return null;
  return `${color}${t}` as ChessPieceKey;
}

function sortCaptured(keys: ChessPieceKey[]): ChessPieceKey[] {
  const sortFn = (a: ChessPieceKey, b: ChessPieceKey) =>
    (PIECE_ORDER[b[1]!] ?? 0) - (PIECE_ORDER[a[1]!] ?? 0);
  return [...keys].sort(sortFn);
}

/** chess.js 1.4+ throws on illegal SAN; older versions returned null. */
function safeApplySan(board: Chess, san: string): Move | null {
  try {
    return board.move(san);
  } catch {
    return null;
  }
}

function countBoardPieces(fen: string): Record<string, number> {
  const placement = fen.split(" ")[0] ?? "";
  const counts: Record<string, number> = {};
  for (const ch of placement) {
    if (ch === "/" || /\d/.test(ch)) continue;
    counts[ch] = (counts[ch] ?? 0) + 1;
  }
  return counts;
}

/**
 * Derives captured piece keys by comparing current FEN material to the starting position.
 * Reliable when only the latest SAN is synced (e.g. after remount mid-game).
 */
export function capturedPieceKeysFromFen(fen: string): {
  capturedByWhite: ChessPieceKey[];
  capturedByBlack: ChessPieceKey[];
} {
  const onBoard = countBoardPieces(fen);
  const capturedByWhite: ChessPieceKey[] = [];
  const capturedByBlack: ChessPieceKey[] = [];

  for (const t of ["Q", "R", "B", "N", "P"] as const) {
    const blackMissing = Math.max(0, STARTING_COUNTS[t] - (onBoard[t.toLowerCase()] ?? 0));
    for (let i = 0; i < blackMissing; i++) capturedByWhite.push(`b${t}`);

    const whiteMissing = Math.max(0, STARTING_COUNTS[t] - (onBoard[t] ?? 0));
    for (let i = 0; i < whiteMissing; i++) capturedByBlack.push(`w${t}`);
  }

  return {
    capturedByWhite: sortCaptured(capturedByWhite),
    capturedByBlack: sortCaptured(capturedByBlack),
  };
}

/**
 * Replays SAN moves and returns captured piece keys for each side’s “graveyard”
 * (victim pieces only — what White took from Black vs what Black took from White).
 */
export function capturedPieceKeysFromSans(sans: string[]): {
  capturedByWhite: ChessPieceKey[];
  capturedByBlack: ChessPieceKey[];
} {
  const g = new Chess();
  const capturedByWhite: ChessPieceKey[] = [];
  const capturedByBlack: ChessPieceKey[] = [];

  for (const san of sans) {
    const m = safeApplySan(g, san);
    if (!m?.captured) continue;
    const victimColor: "w" | "b" = m.color === "w" ? "b" : "w";
    const key = victimKey(victimColor, m.captured);
    if (!key) continue;
    if (m.color === "w") capturedByWhite.push(key);
    else capturedByBlack.push(key);
  }

  return {
    capturedByWhite: sortCaptured(capturedByWhite),
    capturedByBlack: sortCaptured(capturedByBlack),
  };
}
