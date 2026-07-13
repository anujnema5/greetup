import { z } from "zod";

export const searchUsersQuerySchema = z.object({
  q: z.string().max(80).optional().default(""),
  limit: z.coerce.number().int().min(1).max(25).optional().default(12),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
