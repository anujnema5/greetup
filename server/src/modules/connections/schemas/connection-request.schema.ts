import { z } from "zod";

export const connectionRequestBodySchema = z.object({
  targetUserId: z.string().min(1),
});

export type ConnectionRequestBody = z.infer<typeof connectionRequestBodySchema>;
