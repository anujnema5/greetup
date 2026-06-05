import { z } from "zod";

export const initiateConnectionCallSchema = z.object({
  conversationId: z.string().uuid(),
  mode: z.enum(["audio", "video"]),
});

export const respondConnectionCallSchema = z.object({
  accept: z.boolean(),
});

export const cancelConnectionCallSchema = z.object({
  reason: z.enum(["cancelled", "no_answer"]).optional(),
});
