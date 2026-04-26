import { z } from "zod";

export const chessInviteBodySchema = z.object({});

export const chessRespondBodySchema = z.object({
  requestId: z.string().uuid(),
  accept: z.boolean(),
});

export const chessEndBodySchema = z.object({
  gameId: z.string().uuid(),
});

export const chessMoveBodySchema = z.object({
  gameId: z.string().uuid(),
  from: z.string().min(2).max(2),
  to: z.string().min(2).max(2),
  san: z.string().min(1).max(24),
  fen: z.string().min(1).max(128),
  turn: z.enum(["w", "b"]),
  isGameOver: z.boolean(),
  winnerUserId: z.string().min(1).nullable(),
  result: z.enum(["checkmate", "stalemate", "draw"]),
});

export const chessDrawOfferBodySchema = z.object({
  gameId: z.string().uuid(),
});

export const chessDrawRespondBodySchema = z.object({
  gameId: z.string().uuid(),
  accept: z.boolean(),
});

export type ChessRespondBody = z.infer<typeof chessRespondBodySchema>;
export type ChessEndBody = z.infer<typeof chessEndBodySchema>;
export type ChessMoveBody = z.infer<typeof chessMoveBodySchema>;
export type ChessDrawOfferBody = z.infer<typeof chessDrawOfferBodySchema>;
export type ChessDrawRespondBody = z.infer<typeof chessDrawRespondBodySchema>;
