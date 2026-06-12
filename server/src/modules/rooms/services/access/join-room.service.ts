import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomInvitesRepository } from "@/modules/rooms/repositories/room-invites.repository";
import { maybeAutoStartScheduledCircleFromDb } from "@/modules/rooms/services/session/maybe-auto-start-scheduled-circle.service";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { assertGuestMayAccessRoom } from "@/modules/guest";

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

function rejectJoinRoom(
  userId: string,
  roomId: string,
  message: string,
  code: JoinRoomErrorCode,
  statusCode: number,
): never {
  logger.warn("room_join_rejected", { userId, roomId, code, message });
  throw new JoinRoomError(message, code, statusCode);
}

/** Ensures `room_participants` row for RTC (direct + circle). */
export async function joinRoomService(userId: string, roomId: string): Promise<void> {
  let room = await roomsRepository.findRoomById(roomId);

  if (!room) {
    rejectJoinRoom(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }

  await assertGuestMayAccessRoom(userId, {
    roomType: room.roomType,
    sessionKind: room.sessionKind,
  });

  if (room.roomType === "circle" && room.status === "scheduled") {
    await maybeAutoStartScheduledCircleFromDb(roomId);
    room = await roomsRepository.findRoomById(roomId);
    if (!room) {
      rejectJoinRoom(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
    }
  }

  if (room.roomType === "direct" || room.roomType === "circle") {
    const access = await assertRoomSessionOpenOnAccess(roomId);
    if (!access.ok) {
      rejectJoinRoom(userId, roomId, access.message, "ROOM_EXPIRED", 410);
    }
    room = (await roomsRepository.findRoomById(roomId)) ?? room;
  }

  if (room.roomType !== "direct" && room.roomType !== "circle") {
    rejectJoinRoom(userId, roomId, "Unsupported room type", "UNSUPPORTED_ROOM_TYPE", 400);
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
      rejectJoinRoom(
        userId,
        roomId,
        "You are not allowed to rejoin this circle",
        "RESTRICTED",
        403,
      );
    }

    const activeLobby = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);
    if (activeLobby) {
      logger.debug("room_join_skipped_already_participant", { userId, roomId, lobby: true });
      return;
    }
    await ensureCircleRoomParticipation(userId, roomId, room);
    logger.info("room_join_succeeded", { userId, roomId, roomType: room.roomType, lobby: true });
    return;
  }

  if (room.status !== "live") {
    rejectJoinRoom(userId, roomId, "Room is not live yet", "ROOM_NOT_LIVE", 400);
  }

  const active = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);

  if (active) {
    logger.debug("room_join_skipped_already_participant", { userId, roomId });
    return;
  }

  if (room.roomType === "direct") {
    await ensureDirectRoomParticipation(userId, roomId, room);
    logger.info("room_join_succeeded", { userId, roomId, roomType: "direct" });
    return;
  }

  await ensureCircleRoomParticipation(userId, roomId, room);
  await roomSessionsRepository.refreshLiveCircleExpiryAfterParticipantJoin(roomId);
  logger.info("room_join_succeeded", { userId, roomId, roomType: "circle" });
}

async function ensureDirectRoomParticipation(
  userId: string,
  roomId: string,
  room: NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>,
): Promise<void> {
  if (room.hostUserId === userId) {
    await roomParticipantsRepository.addOrReactivateHostRow(roomId, userId);
    return;
  }

  const anyRow = await roomParticipantsRepository.findRoomParticipant(roomId, userId);

  if (anyRow) {
    if (anyRow.leftAt != null) {
      if (anyRow.role === "host") {
        await roomParticipantsRepository.addOrReactivateHostRow(roomId, userId);
      } else {
        await roomParticipantsRepository.addOrReactivateParticipantRow(roomId, userId);
      }
    }
    return;
  }

  const pair = await readMatchPairFromRedis(roomId);
    if (pair && (pair.userA === userId || pair.userB === userId)) {
    if (pair.userA === userId) {
      await roomParticipantsRepository.addOrReactivateHostRow(roomId, userId);
    } else {
      await roomParticipantsRepository.addOrReactivateParticipantRow(roomId, userId);
    }
    return;
  }

  if (room.visibility === "private") {
    const invite = await roomInvitesRepository.findFriendInvite(roomId, userId);
    if (invite) {
      await roomParticipantsRepository.addOrReactivateParticipantRow(roomId, userId);
      return;
    }
  }

  rejectJoinRoom(userId, roomId, "You are not allowed to join this room", "NOT_ALLOWED", 403);
}

async function ensureCircleRoomParticipation(
  userId: string,
  roomId: string,
  room: NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>,
): Promise<void> {
  if (room.hostUserId === userId) {
    await roomParticipantsRepository.addOrReactivateHostRow(roomId, userId);
    return;
  }

  if (await roomRestrictedUsersRepository.isRoomRestrictedUser(roomId, userId)) {
    rejectJoinRoom(
      userId,
      roomId,
      "You are not allowed to rejoin this circle",
      "RESTRICTED",
      403,
    );
  }

  const priorRow = await roomParticipantsRepository.wasUserRoomParticipant(roomId, userId);

  if (priorRow) {
    await roomParticipantsRepository.addOrReactivateParticipantRow(roomId, userId);
    return;
  }

  const n = await roomParticipantsRepository.countActiveParticipants(roomId);
  if (n >= room.maxParticipants) {
    rejectJoinRoom(
      userId,
      roomId,
      `This circle is full (${room.maxParticipants} seats including the host).`,
      "ROOM_FULL",
      400,
    );
  }

  if (room.visibility === "public") {
    await roomParticipantsRepository.addOrReactivateParticipantRow(roomId, userId);
    return;
  }

  const invite = await roomInvitesRepository.findFriendInvite(roomId, userId);
  if (!invite) {
    rejectJoinRoom(userId, roomId, "You are not allowed to join this room", "NOT_ALLOWED", 403);
  }

  await roomParticipantsRepository.addOrReactivateParticipantRow(roomId, userId);
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


