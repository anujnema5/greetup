import { z } from "zod";

export const listConnectionsQuerySchema = z.object({
  filter: z
    .enum(["accepted", "pending_incoming", "pending_outgoing"])
    .optional()
    .default("accepted"),
  /** 1-based page; when `limit` is set, results are paginated. */
  page: z.coerce.number().int().min(1).optional().default(1),
  /** When set, enables pagination + server-side search on peer name. Max 50. */
  limit: z.coerce.number().int().min(1).max(50).optional(),
  /** Case-insensitive match on peer display name or name */
  q: z.string().max(100).optional().default(""),
});

export type ListConnectionsQuery = z.infer<typeof listConnectionsQuerySchema>;

export type ConnectionsListFilter = ListConnectionsQuery["filter"];
