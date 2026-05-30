import { z } from "zod";

export const blockUserBodySchema = z.object({
  targetUserId: z.string().min(1),
});

export type BlockUserBody = z.infer<typeof blockUserBodySchema>;
