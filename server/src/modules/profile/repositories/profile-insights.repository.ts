import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms, userProfiles, users } from "@/core/database/schema";
import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";

const MATCH_ENGINE_ROOM_TITLE = "Match";

const peerParticipants = alias(roomParticipants, "profile_insights_peer_participants");

export const profileInsightsRepository = {
  countAcceptedConnections(userId: string) {
    return userConnectionsRepository.countForListFilter(userId, "accepted");
  },

  async countJoinedCircles(userId: string): Promise<number> {
    const [{ n }] = await db
      .select({ n: count() })
      .from(roomParticipants)
      .innerJoin(rooms, eq(rooms.id, roomParticipants.roomId))
      .where(and(eq(roomParticipants.userId, userId), eq(rooms.roomType, "circle")));
    return Number(n ?? 0);
  },

  async countMatchSessions(userId: string): Promise<number> {
    const [{ n }] = await db
      .select({ n: count() })
      .from(roomParticipants)
      .innerJoin(rooms, eq(rooms.id, roomParticipants.roomId))
      .where(
        and(
          eq(roomParticipants.userId, userId),
          eq(rooms.roomType, "direct"),
          eq(rooms.title, MATCH_ENGINE_ROOM_TITLE),
        ),
      );
    return Number(n ?? 0);
  },

  async getProfileCompletion(userId: string): Promise<number | null> {
    const row = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { profileCompletion: true },
    });
    return row?.profileCompletion ?? null;
  },

  async listRecentMatchSessions(userId: string, limit: number) {
    const rows = await db
      .select({
        roomId: rooms.id,
        startedAt: rooms.startedAt,
        createdAt: rooms.createdAt,
        peerUserId: peerParticipants.userId,
      })
      .from(roomParticipants)
      .innerJoin(rooms, eq(rooms.id, roomParticipants.roomId))
      .innerJoin(
        peerParticipants,
        and(eq(peerParticipants.roomId, rooms.id), ne(peerParticipants.userId, userId)),
      )
      .where(
        and(
          eq(roomParticipants.userId, userId),
          eq(rooms.roomType, "direct"),
          eq(rooms.title, MATCH_ENGINE_ROOM_TITLE),
        ),
      )
      .orderBy(desc(sql`coalesce(${rooms.startedAt}, ${rooms.createdAt})`))
      .limit(limit);

    return rows.map((row) => ({
      roomId: row.roomId,
      peerUserId: row.peerUserId,
      matchedAt: row.startedAt ?? row.createdAt,
    }));
  },

  async loadPeerUsers(peerUserIds: string[]) {
    if (peerUserIds.length === 0) return [];

    return db.query.users.findMany({
      where: inArray(users.id, peerUserIds),
      columns: {
        id: true,
        displayName: true,
        name: true,
        image: true,
        username: true,
      },
      with: {
        profile: {
          columns: {
            bio: true,
            profession: true,
          },
        },
      },
    });
  },
};
