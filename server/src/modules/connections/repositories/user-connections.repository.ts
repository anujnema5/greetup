import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

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
  async countForListFilter(userId: string, filter: ConnectionsListFilter) {
    const where = whereConnectionsListFilter(userId, filter);
    const [{ n }] = await db
      .select({ n: count() })
      .from(userConnections)
      .where(where);
    return Number(n ?? 0);
  },

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

  /**
   * All rows between two users (0–2). The unique index is per direction, so both
   * (A→B) and (B→A) can exist at once — callers must not assume a single row.
   */
  async findAllBetween(userA: string, userB: string) {
    return db.query.userConnections.findMany({
      where: or(
        and(eq(userConnections.requesterId, userA), eq(userConnections.addresseeId, userB)),
        and(eq(userConnections.requesterId, userB), eq(userConnections.addresseeId, userA)),
      ),
    });
  },

  /**
   * Row fields needed to validate accept/reject incoming connection (addressee-only).
   */
  async findByIdForIncomingRespond(connectionId: string) {
    return db.query.userConnections.findFirst({
      where: eq(userConnections.id, connectionId),
      columns: {
        id: true,
        requesterId: true,
        addresseeId: true,
        status: true,
      },
    });
  },

  async updateStatusById(
    connectionId: string,
    status: "pending" | "accepted" | "rejected" | "cancelled",
  ) {
    await db
      .update(userConnections)
      .set({ status, updatedAt: new Date() })
      .where(eq(userConnections.id, connectionId));
  },

  async markAcceptedById(connectionId: string) {
    await userConnectionsRepository.updateStatusById(connectionId, "accepted");
  },

  async deleteById(connectionId: string) {
    await db.delete(userConnections).where(eq(userConnections.id, connectionId));
  },

  async markPendingById(connectionId: string) {
    await db
      .update(userConnections)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(userConnections.id, connectionId));
  },

  async setAsPendingRequest(params: {
    connectionId: string;
    requesterId: string;
    addresseeId: string;
  }) {
    await db
      .update(userConnections)
      .set({
        requesterId: params.requesterId,
        addresseeId: params.addresseeId,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(eq(userConnections.id, params.connectionId));
  },

  async insertPendingRequest(requesterId: string, addresseeId: string) {
    const [row] = await db
      .insert(userConnections)
      .values({
        requesterId,
        addresseeId,
        status: "pending",
      })
      .returning({ id: userConnections.id });

    return row ?? null;
  },

  async findByIdForDisconnect(connectionId: string) {
    return db.query.userConnections.findFirst({
      where: eq(userConnections.id, connectionId),
      columns: {
        id: true,
        requesterId: true,
        addresseeId: true,
        status: true,
      },
    });
  },

  /** Cancel an accepted connection; `viewerId` must be requester or addressee (enforced in SQL). */
  async cancelAcceptedConnectionAsPeer(connectionId: string, viewerId: string) {
    await db
      .update(userConnections)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userConnections.id, connectionId),
          or(
            eq(userConnections.requesterId, viewerId),
            eq(userConnections.addresseeId, viewerId),
          ),
        ),
      );
  },

  async findByIdForWithdraw(connectionId: string) {
    return db.query.userConnections.findFirst({
      where: eq(userConnections.id, connectionId),
      columns: {
        id: true,
        requesterId: true,
        status: true,
      },
    });
  },

  async cancelPendingOutgoingRequest(connectionId: string, requesterId: string) {
    await db
      .update(userConnections)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(eq(userConnections.id, connectionId), eq(userConnections.requesterId, requesterId)),
      );
  },
};
