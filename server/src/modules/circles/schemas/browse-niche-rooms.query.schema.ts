import { z } from "zod";

export const browseNicheRoomsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type BrowseNicheRoomsQuery = z.infer<typeof browseNicheRoomsQuerySchema>;
