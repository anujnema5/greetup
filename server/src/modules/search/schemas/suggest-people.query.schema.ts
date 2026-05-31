import { z } from "zod";

export const suggestPeopleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(5),
});

export type SuggestPeopleQuery = z.infer<typeof suggestPeopleQuerySchema>;
