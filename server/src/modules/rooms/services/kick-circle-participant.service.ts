import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";
import { emitToUser } from "@/core/socket/socket";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/room-expiry";
import { CIRCLE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/circle-room-socket.events";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { notifyRtcServiceKickPeer } from "@/modules/rooms/services/rtc-kick-peer.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";

export type KickCircleParticipantOptions = {
  /** When true, the user cannot rejoin this circle until the restriction is cleared. */
  restrict?: boolean;
};

export type KickCircleParticipantErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_HOST"
  | "INVALID_STATE"
  | "TARGET_NOT_FOUND"
  | "CANNOT_REMOVE_SELF"
  | "CANNOT_REMOVE_HOST";

export class KickCircleParticipantError extends Error {
  constructor(
    message: string,
    public readonly code: KickCircleParticipantErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "KickCircleParticipantError";
  }
}

/**
 * Host-only: marks the target participant as left, clears their active RTC room key,
 * evicts them from rtc-service, and notifies them on the main app socket.
 */
export async function kickCircleParticipantService(
  hostUserId: string,
  roomId: string,
  targetUserId: string,
  options: KickCircleParticipantOptions = {},
): Promise<{ removed: boolean; restricted: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") {
    throw new KickCircleParticipantError("Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.hostUserId !== hostUserId) {
    throw new KickCircleParticipantError(
      "Only the host can remove participants",
      "NOT_HOST",
      403,
    );
  }
  if (targetUserId === hostUserId) {
    throw new KickCircleParticipantError(
      "You cannot remove yourself from the circle",
      "CANNOT_REMOVE_SELF",
      400,
    );
  }
  if (targetUserId === room.hostUserId) {
    throw new KickCircleParticipantError(
      "The host cannot be removed",
      "CANNOT_REMOVE_HOST",
      400,
    );
  }

  if (isDbRoomSessionClosed(room)) {
    await clearUserActiveRtcRoom(targetUserId);
    return { removed: false, restricted: false };
  }

  if (room.status !== "live") {
    throw new KickCircleParticipantError("Room is not live", "INVALID_STATE", 400);
  }

  const activeTarget = await db.query.roomParticipants.findFirst({
    where: and(
      eq(roomParticipants.roomId, roomId),
      eq(roomParticipants.userId, targetUserId),
      isNull(roomParticipants.leftAt),
    ),
    columns: { id: true },
  });

  if (!activeTarget) {
    throw new KickCircleParticipantError(
      "Participant is not in this call",
      "TARGET_NOT_FOUND",
      404,
    );
  }

  const now = new Date();
  await db
    .update(roomParticipants)
    .set({ leftAt: now, updatedAt: now })
    .where(
      and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, targetUserId),
        isNull(roomParticipants.leftAt),
      ),
    );

  await clearUserActiveRtcRoom(targetUserId);
  await notifyRtcServiceKickPeer(roomId, targetUserId);
  emitToUser(targetUserId, CIRCLE_ROOM_SOCKET_EVENTS.participantRemoved, { roomId });

  let restricted = false;
  if (options.restrict) {
    await roomRestrictedUsersRepository.addRoomRestrictedUser(roomId, targetUserId, hostUserId);
    restricted = true;
  }

  return { removed: true, restricted };
}
