import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { notifications, users } from "@/core/database/schema";

export type NotificationActorSnapshot = {
  id: string;
  name: string;
  image: string | null;
  username: string | null;
};

export type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type:
    | "connection_request_received"
    | "connection_request_accepted"
    | "space_invite_received"
    | "space_started";
  entityType: "connection" | "room";
  entityId: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
};

export const notificationsRepository = {
  // --- Actor (users table) for payloads

  async findActorSnapshotByUserId(actorUserId: string): Promise<NotificationActorSnapshot | null> {
    const actor = await db.query.users.findFirst({
      where: eq(users.id, actorUserId),
      columns: {
        id: true,
        name: true,
        displayName: true,
        image: true,
        username: true,
      },
    });

    if (!actor) return null;

    return {
      id: actor.id,
      name: actor.displayName ?? actor.name ?? "Someone",
      image: actor.image ?? null,
      username: actor.username ?? null,
    };
  },

  // --- Rows

  async create(input: CreateNotificationInput) {
    const [row] = await db
      .insert(notifications)
      .values({
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        body: input.body,
        payload: input.payload ?? {},
        dedupeKey: input.dedupeKey,
      })
      .onConflictDoNothing({
        target: [notifications.dedupeKey],
      })
      .returning();

    return row ?? null;
  },

  // --- Inbox

  async listForUser(userId: string, page: number, limit: number, unreadOnly: boolean) {
    const offset = (page - 1) * limit;
    const where = unreadOnly
      ? and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt))
      : eq(notifications.recipientUserId, userId);

    const rows = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({
        total: count(),
      })
      .from(notifications)
      .where(where);

    return {
      items: rows,
      page,
      limit,
      total,
      hasMore: offset + rows.length < total,
    };
  },

  async unreadCountForUser(userId: string) {
    const [{ total }] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
      })
      .from(notifications)
      .where(and(eq(notifications.recipientUserId, userId), isNull(notifications.readAt)));
    return total ?? 0;
  },

  async markRead(userId: string, notificationId: string) {
    const [row] = await db
      .update(notifications)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientUserId, userId),
        ),
      )
      .returning({
        id: notifications.id,
      });

    return row ?? null;
  },

  async markAllRead(userId: string) {
    const rows = await db
      .update(notifications)
      .set({
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({
        id: notifications.id,
      });

    return rows.length;
  },
};
