import { z } from "zod";

export const profileInsightsQuerySchema = z.object({
  recentLimit: z.coerce.number().int().min(1).max(50).optional(),
});

export type ProfileInsightsQuery = z.infer<typeof profileInsightsQuerySchema>;
