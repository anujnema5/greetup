import { z } from "zod";

export const peersCallStatusBodySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(200),
});
