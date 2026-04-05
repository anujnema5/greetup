import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/core/database";
import { users, userConnections } from "@/core/database/schema";

import type { ConnectionsListFilter } from "../schemas/connections-list.query.schema";
import {
  whereAcceptedConnectionsForUser,
  whereConnectionsListFilter,
} from "../lib/connection-filters";
import { escapeIlikePattern } from "@/shared/sql/ilike-escape";

const requesterUser = alias(users, "conn_list_requester");
const addresseeUser = alias(users, "conn_list_addressee");

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

  /**
   * Paginated list with optional peer name search (display name or name).
   */
  async findManyWithPeersForListPaged(
    userId: string,
    filter: ConnectionsListFilter,
    opts: { page: number; limit: number; q?: string },
  ) {
    const { page, limit, q } = opts;
    const take = limit + 1;
    const offset = (page - 1) * limit;

    const baseFilter = whereConnectionsListFilter(userId, filter);

    const searchFilter =
      q && q.trim().length > 0
        ? (() => {
            const pattern = `%${escapeIlikePattern(q.trim())}%`;
            return or(
              and(
                eq(userConnections.requesterId, userId),
                or(
                  ilike(addresseeUser.displayName, pattern),
                  ilike(addresseeUser.name, pattern),
                ),
              ),
              and(
                eq(userConnections.addresseeId, userId),
                or(
                  ilike(requesterUser.displayName, pattern),
                  ilike(requesterUser.name, pattern),
                ),
              ),
            );
          })()
        : undefined;

    const whereClause = searchFilter ? and(baseFilter, searchFilter) : baseFilter;

    const idRows = await db
      .select({ id: userConnections.id })
      .from(userConnections)
      .innerJoin(requesterUser, eq(userConnections.requesterId, requesterUser.id))
      .innerJoin(addresseeUser, eq(userConnections.addresseeId, addresseeUser.id))
      .where(whereClause)
      .orderBy(desc(userConnections.createdAt))
      .limit(take)
      .offset(offset);

    const ids = idRows.map((r) => r.id);
    const hasMore = ids.length > limit;
    const pageIds = hasMore ? ids.slice(0, limit) : ids;

    if (pageIds.length === 0) {
      return { rows: [], hasMore: false };
    }

    const rows = await db.query.userConnections.findMany({
      where: inArray(userConnections.id, pageIds),
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
    });

    const order = new Map(pageIds.map((id, i) => [id, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return { rows, hasMore };
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

  /** Single row if any connection exists between the two users (either direction). */
  async findUndirected(userA: string, userB: string) {
    return db.query.userConnections.findFirst({
      where: or(
        and(eq(userConnections.requesterId, userA), eq(userConnections.addresseeId, userB)),
        and(eq(userConnections.requesterId, userB), eq(userConnections.addresseeId, userA)),
      ),
    });
  },
};
