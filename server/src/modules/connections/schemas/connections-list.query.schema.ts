import { z } from "zod";

export const listConnectionsQuerySchema = z.object({
  filter: z
    .enum(["accepted", "pending_incoming", "pending_outgoing"])
    .optional()
    .default("accepted"),
});

export type ListConnectionsQuery = z.infer<typeof listConnectionsQuerySchema>;

export type ConnectionsListFilter = ListConnectionsQuery["filter"];
