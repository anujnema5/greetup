import type { SQL } from "drizzle-orm";
import { and, eq, or } from "drizzle-orm";

import { userConnections } from "@/core/database/schema";

import type { ConnectionsListFilter } from "../schemas/connections-list.query.schema";

/** Rows where `userId` is requester or addressee and status is `accepted`. */
export function whereAcceptedConnectionsForUser(userId: string): SQL {
  return and(
    eq(userConnections.status, "accepted"),
    or(
      eq(userConnections.requesterId, userId),
      eq(userConnections.addresseeId, userId),
    ),
  ) as SQL;
}

export function whereConnectionsListFilter(
  userId: string,
  filter: ConnectionsListFilter,
): SQL {
  switch (filter) {
    case "accepted":
      return whereAcceptedConnectionsForUser(userId);
    case "pending_incoming":
      return and(
        eq(userConnections.status, "pending"),
        eq(userConnections.addresseeId, userId),
      ) as SQL;
    case "pending_outgoing":
      return and(
        eq(userConnections.status, "pending"),
        eq(userConnections.requesterId, userId),
      ) as SQL;
  }
}
