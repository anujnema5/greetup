import { db } from "@/core/database";

import type { ConnectionsListFilter } from "../schemas/connections-list.query.schema";
import {
  whereAcceptedConnectionsForUser,
  whereConnectionsListFilter,
} from "../lib/connection-filters";

export const userConnectionsRepository = {
  async findManyWithPeersForList(userId: string, filter: ConnectionsListFilter) {
    const where = whereConnectionsListFilter(userId, filter);
    return db.query.userConnections.findMany({
      where,
      with: {
        requester: {
          with: {
            profile: true,
          },
        },
        addressee: {
          with: {
            profile: true,
          },
        },
      },
      orderBy: (uc, { desc: d }) => [d(uc.createdAt)],
    });
  },

  async findAcceptedPeerIdColumns(userId: string) {
    return db.query.userConnections.findMany({
      where: whereAcceptedConnectionsForUser(userId),
      columns: {
        requesterId: true,
        addresseeId: true,
      },
    });
  },
};
