import { z } from "zod";

export const createConnectRequestBodySchema = z.object({
  targetUserId: z.string().min(1),
  message: z.string().max(280).optional().nullable(),
});

export const respondConnectRequestBodySchema = z.object({
  accept: z.boolean(),
});

export type CreateConnectRequestBody = z.infer<typeof createConnectRequestBodySchema>;
