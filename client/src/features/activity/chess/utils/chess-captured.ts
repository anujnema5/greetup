import { Chess } from "chess.js";

/** Lichess piece asset keys, e.g. `wP`, `bQ`. */
export type ChessPieceKey = `${"w" | "b"}${"P" | "N" | "B" | "R" | "Q"}`;

const PIECE_ORDER: Record<string, number> = { Q: 5, R: 4, B: 3, N: 2, P: 1 };

function victimKey(color: "w" | "b", capturedType: string): ChessPieceKey | null {
  const t = capturedType.toUpperCase();
  if (t !== "P" && t !== "N" && t !== "B" && t !== "R" && t !== "Q") return null;
  return `${color}${t}` as ChessPieceKey;
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
    const m = g.move(san);
    if (!m?.captured) continue;
    const victimColor: "w" | "b" = m.color === "w" ? "b" : "w";
    const key = victimKey(victimColor, m.captured);
    if (!key) continue;
    if (m.color === "w") capturedByWhite.push(key);
    else capturedByBlack.push(key);
  }

  const sortFn = (a: ChessPieceKey, b: ChessPieceKey) =>
    (PIECE_ORDER[b[1]!] ?? 0) - (PIECE_ORDER[a[1]!] ?? 0);

  capturedByWhite.sort(sortFn);
  capturedByBlack.sort(sortFn);

  return { capturedByWhite, capturedByBlack };
}
