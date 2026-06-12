import { z } from "zod";

export const createGuestSessionBodySchema = z.object({
  deviceFingerprint: z.string().min(8).max(512).optional(),
});

export type CreateGuestSessionBody = z.infer<typeof createGuestSessionBodySchema>;
