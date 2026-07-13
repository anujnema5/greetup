import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { connectRequests } from "@/core/database/schema";
import { CONNECT_REQUEST_MAX_INBOUND_PENDING } from "../constants";

export const connectRequestsRepository = {
  async findById(id: string) {
    return db.query.connectRequests.findFirst({
      where: eq(connectRequests.id, id),
    });
  },

  async findPendingBetween(requesterUserId: string, targetUserId: string) {
    return db.query.connectRequests.findFirst({
      where: and(
        eq(connectRequests.requesterUserId, requesterUserId),
        eq(connectRequests.targetUserId, targetUserId),
        eq(connectRequests.status, "pending"),
      ),
    });
  },

  async countInboundPending(targetUserId: string, now = new Date()) {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectRequests)
      .where(
        and(
          eq(connectRequests.targetUserId, targetUserId),
          eq(connectRequests.status, "pending"),
          gte(connectRequests.expiresAt, now),
        ),
      );
    return rows[0]?.count ?? 0;
  },

  async countOutboundSince(requesterUserId: string, since: Date) {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(connectRequests)
      .where(
        and(
          eq(connectRequests.requesterUserId, requesterUserId),
          gte(connectRequests.createdAt, since),
        ),
      );
    return rows[0]?.count ?? 0;
  },

  async findRecentRejected(
    requesterUserId: string,
    targetUserId: string,
    since: Date,
  ) {
    return db.query.connectRequests.findFirst({
      where: and(
        eq(connectRequests.requesterUserId, requesterUserId),
        eq(connectRequests.targetUserId, targetUserId),
        eq(connectRequests.status, "rejected"),
        gte(connectRequests.respondedAt, since),
      ),
      orderBy: [desc(connectRequests.respondedAt)],
    });
  },

  async createPending(data: {
    requesterUserId: string;
    targetUserId: string;
    message: string | null;
    expiresAt: Date;
  }) {
    const [row] = await db
      .insert(connectRequests)
      .values({
        requesterUserId: data.requesterUserId,
        targetUserId: data.targetUserId,
        message: data.message,
        status: "pending",
        expiresAt: data.expiresAt,
      })
      .returning();
    return row ?? null;
  },

  async markExpired(ids: string[]) {
    if (ids.length === 0) return;
    const now = new Date();
    await db
      .update(connectRequests)
      .set({ status: "expired", respondedAt: now })
      .where(
        and(inArray(connectRequests.id, ids), eq(connectRequests.status, "pending")),
      );
  },

  async listInboundPending(targetUserId: string, now = new Date()) {
    return db.query.connectRequests.findMany({
      where: and(
        eq(connectRequests.targetUserId, targetUserId),
        eq(connectRequests.status, "pending"),
        gte(connectRequests.expiresAt, now),
      ),
      orderBy: [desc(connectRequests.createdAt)],
      limit: CONNECT_REQUEST_MAX_INBOUND_PENDING,
    });
  },

  async listOutboundRecent(requesterUserId: string, limit = 20) {
    return db.query.connectRequests.findMany({
      where: eq(connectRequests.requesterUserId, requesterUserId),
      orderBy: [desc(connectRequests.createdAt)],
      limit,
    });
  },

  async respond(
    id: string,
    data: {
      status: "accepted" | "rejected" | "cancelled" | "expired";
      roomId?: string | null;
    },
  ) {
    const now = new Date();
    const [row] = await db
      .update(connectRequests)
      .set({
        status: data.status,
        roomId: data.roomId ?? null,
        respondedAt: now,
      })
      .where(and(eq(connectRequests.id, id), eq(connectRequests.status, "pending")))
      .returning();
    return row ?? null;
  },
};
