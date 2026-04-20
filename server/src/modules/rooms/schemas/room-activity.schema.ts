import { z } from "zod";

export const chessInviteBodySchema = z.object({});

export const chessRespondBodySchema = z.object({
  requestId: z.string().uuid(),
  accept: z.boolean(),
});

export const chessEndBodySchema = z.object({
  gameId: z.string().uuid(),
});

export type ChessRespondBody = z.infer<typeof chessRespondBodySchema>;
export type ChessEndBody = z.infer<typeof chessEndBodySchema>;
