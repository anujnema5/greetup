import { z } from "zod";

export const usernameCheckQuerySchema = z.object({
  username: z.string().min(1).max(30),
});

export const usernameSuggestionsQuerySchema = z.object({
  vibe: z.enum(["cozy", "playful", "mysterious", "creative", "classic", "random"]).optional(),
  limit: z.coerce.number().int().min(1).max(8).optional(),
});
