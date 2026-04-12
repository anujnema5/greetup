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

export const matchFailedBodySchema = z.object({
  attemptId: z.string().min(1),
  userId: z.string().min(1),
  reason: z.string().min(1),
});

export const matchProposedBodySchema = z.object({
  userA: z.string().min(1),
  userB: z.string().min(1),
  attemptIdA: z.string().min(1),
  attemptIdB: z.string().min(1),
  matchScore: z.number(),
  isFallbackMatch: z.boolean(),
});

export const matchProposalCancelledBodySchema = z.object({
  userId: z.string().min(1),
  attemptId: z.string().min(1),
  reason: z.string().min(1),
});

export const ensureProfileSnapshotBodySchema = z.object({
  userId: z.string().min(1),
});

export const expandDirectInviteBodySchema = z.object({
  inviteeUserId: z.string().min(1),
});

export const expandDirectRespondBodySchema = z.object({
  inviteId: z.string().uuid(),
  accept: z.boolean(),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type MatchCompletedBody = z.infer<typeof matchCompletedBodySchema>;
export type MatchFailedBody = z.infer<typeof matchFailedBodySchema>;
export type MatchProposedBody = z.infer<typeof matchProposedBodySchema>;
export type MatchProposalCancelledBody = z.infer<typeof matchProposalCancelledBodySchema>;
export type EnsureProfileSnapshotBody = z.infer<typeof ensureProfileSnapshotBodySchema>;
