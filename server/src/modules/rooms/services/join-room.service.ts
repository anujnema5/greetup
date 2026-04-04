import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomFriendInvites, roomParticipants } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

export type JoinRoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "ROOM_FULL"
  | "NOT_ALLOWED"
  | "UNSUPPORTED_ROOM_TYPE";

export class JoinRoomError extends Error {
  constructor(
    message: string,
    public readonly code: JoinRoomErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "JoinRoomError";
  }
}

/**
 * Ensures the caller is in `room_participants` so `issueRtcTokenService` can issue a JWT.
 * Used for **direct** (match or scheduled) and **circle** rooms — same entry path as RTC.
 */
export async function joinRoomService(userId: string, roomId: string): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);

  if (!room) {
    throw new JoinRoomError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (room.roomType !== "direct" && room.roomType !== "circle") {
    throw new JoinRoomError("Unsupported room type", "UNSUPPORTED_ROOM_TYPE", 400);
  }

  if (room.status !== "live") {
    throw new JoinRoomError("Room is not live yet", "ROOM_NOT_LIVE", 400);
  }

  const active = await db.query.roomParticipants.findFirst({
    where: and(
      eq(roomParticipants.roomId, roomId),
      eq(roomParticipants.userId, userId),
      isNull(roomParticipants.leftAt),
    ),
    columns: { id: true },
  });

  if (active) {
    return;
  }

  if (room.roomType === "direct") {
    await ensureDirectRoomParticipation(userId, roomId, room);
    return;
  }

  await ensureCircleRoomParticipation(userId, roomId, room);
}

async function ensureDirectRoomParticipation(
  userId: string,
  roomId: string,
  room: NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>,
): Promise<void> {
  if (room.hostUserId === userId) {
    await addOrReactivateHostRow(roomId, userId);
    return;
  }

  const anyRow = await db.query.roomParticipants.findFirst({
    where: and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, userId)),
    columns: { role: true, leftAt: true },
  });

  if (anyRow) {
    if (anyRow.leftAt != null) {
      if (anyRow.role === "host") {
        await addOrReactivateHostRow(roomId, userId);
      } else {
        await addOrReactivateParticipantRow(roomId, userId);
      }
    }
    return;
  }

  const pair = await readMatchPairFromRedis(roomId);
  if (pair && (pair.userA === userId || pair.userB === userId)) {
    if (pair.userA === userId) {
      await addOrReactivateHostRow(roomId, userId);
    } else {
      await addOrReactivateParticipantRow(roomId, userId);
    }
    return;
  }

  if (room.visibility === "private") {
    const invite = await findFriendInvite(roomId, userId);
    if (invite) {
      await addOrReactivateParticipantRow(roomId, userId);
      return;
    }
  }

  throw new JoinRoomError("You are not allowed to join this room", "NOT_ALLOWED", 403);
}

async function ensureCircleRoomParticipation(
  userId: string,
  roomId: string,
  room: NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>,
): Promise<void> {
  if (room.hostUserId === userId) {
    await addOrReactivateHostRow(roomId, userId);
    return;
  }

  const [countRow] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(roomParticipants)
    .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

  const n = countRow?.n ?? 0;
  if (n >= room.maxParticipants) {
    throw new JoinRoomError("This circle is full", "ROOM_FULL", 400);
  }

  if (room.visibility === "public") {
    await addOrReactivateParticipantRow(roomId, userId);
    return;
  }

  const invite = await findFriendInvite(roomId, userId);
  if (!invite) {
    throw new JoinRoomError("You are not allowed to join this room", "NOT_ALLOWED", 403);
  }

  await addOrReactivateParticipantRow(roomId, userId);
}

async function readMatchPairFromRedis(
  roomId: string,
): Promise<{ userA: string; userB: string } | null> {
  const redis = getRedis();
  const raw = await redis.hgetall(`${ROOM_KEYS.ROOM}${roomId}`);
  if (!raw?.roomId || raw.sessionKind !== "match") {
    return null;
  }
  const userA = raw.userA;
  const userB = raw.userB;
  if (typeof userA !== "string" || typeof userB !== "string" || !userA || !userB) {
    return null;
  }
  return { userA, userB };
}

async function findFriendInvite(roomId: string, userId: string) {
  return db.query.roomFriendInvites.findFirst({
    where: and(
      eq(roomFriendInvites.roomId, roomId),
      eq(roomFriendInvites.inviteeUserId, userId),
      inArray(roomFriendInvites.status, ["pending", "accepted"]),
    ),
    columns: { id: true },
  });
}

async function addOrReactivateParticipantRow(roomId: string, userId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(roomParticipants)
    .values({
      roomId,
      userId,
      role: "participant",
      joinedAt: now,
    })
    .onConflictDoUpdate({
      target: [roomParticipants.roomId, roomParticipants.userId],
      set: {
        leftAt: null,
        joinedAt: now,
        updatedAt: now,
      },
    });
}

async function addOrReactivateHostRow(roomId: string, userId: string): Promise<void> {
  const now = new Date();
  await db
    .insert(roomParticipants)
    .values({
      roomId,
      userId,
      role: "host",
      joinedAt: now,
    })
    .onConflictDoUpdate({
      target: [roomParticipants.roomId, roomParticipants.userId],
      set: {
        leftAt: null,
        joinedAt: now,
        updatedAt: now,
        role: "host",
      },
    });
}
