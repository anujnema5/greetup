import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomFriendInvites, roomParticipants } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { maybeAutoStartScheduledCircleFromDb } from "@/modules/rooms/services/maybe-auto-start-scheduled-circle.service";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/reconcile-room-session-on-access.service";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";

export type JoinRoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "LOBBY_NOT_READY"
  | "ROOM_EXPIRED"
  | "ROOM_FULL"
  | "NOT_ALLOWED"
  | "RESTRICTED"
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

/** Ensures `room_participants` row for RTC (direct + circle). */
export async function joinRoomService(userId: string, roomId: string): Promise<void> {
  let room = await roomsRepository.findRoomById(roomId);

  if (!room) {
    throw new JoinRoomError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (room.roomType === "circle" && room.status === "scheduled") {
    await maybeAutoStartScheduledCircleFromDb(roomId);
    room = await roomsRepository.findRoomById(roomId);
    if (!room) {
      throw new JoinRoomError("Room not found", "ROOM_NOT_FOUND", 404);
    }
  }

  if (room.roomType === "direct" || room.roomType === "circle") {
    const access = await assertRoomSessionOpenOnAccess(roomId);
    if (!access.ok) {
      throw new JoinRoomError(access.message, "ROOM_EXPIRED", 410);
    }
    room = (await roomsRepository.findRoomById(roomId)) ?? room;
  }

  if (room.roomType !== "direct" && room.roomType !== "circle") {
    throw new JoinRoomError("Unsupported room type", "UNSUPPORTED_ROOM_TYPE", 400);
  }

  /**
   * Circle not `live` yet (scheduled / waiting to go live): still create or refresh the
   * participant row so the client can enter the in-app lobby. RTC stays gated in
   * `issue-rtc-token` until the circle room is ready.
   */
  if (room.roomType === "circle" && room.status !== "live") {
    if (
      userId !== room.hostUserId &&
      (await roomRestrictedUsersRepository.isRoomRestrictedUser(roomId, userId))
    ) {
      throw new JoinRoomError(
        "You are not allowed to rejoin this circle",
        "RESTRICTED",
        403,
      );
    }

    const activeLobby = await db.query.roomParticipants.findFirst({
      where: and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, userId),
        isNull(roomParticipants.leftAt),
      ),
      columns: { id: true },
    });
    if (activeLobby) {
      return;
    }
    await ensureCircleRoomParticipation(userId, roomId, room);
    return;
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
  await roomsRepository.refreshLiveCircleExpiryAfterParticipantJoin(roomId);
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

  if (await roomRestrictedUsersRepository.isRoomRestrictedUser(roomId, userId)) {
    throw new JoinRoomError(
      "You are not allowed to rejoin this circle",
      "RESTRICTED",
      403,
    );
  }

  const [countRow] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(roomParticipants)
    .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

  const n = countRow?.n ?? 0;
  if (n >= room.maxParticipants) {
    throw new JoinRoomError(
      `This circle is full (${room.maxParticipants} seats including the host).`,
      "ROOM_FULL",
      400,
    );
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
