import { z } from "zod";

export const createRoomBodySchema = z.object({
  attemptId: z.string().min(1),
  pairId: z.string().min(1),
  users: z.tuple([z.string().min(1), z.string().min(1)]),
});

export const matchCompletedBodySchema = z.object({
  attemptId: z.string().min(1),
  userA: z.string().min(1),
  userB: z.string().min(1),
  roomId: z.string().min(1),
  matchScore: z.number(),
  isFallbackMatch: z.boolean(),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type MatchCompletedBody = z.infer<typeof matchCompletedBodySchema>;
