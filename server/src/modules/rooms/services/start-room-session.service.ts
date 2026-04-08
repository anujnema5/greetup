import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { notifyCircleStarted } from "../notifications";

import { provisionSessionRoomRedis } from "./session-room-redis.service";

export type StartRoomSessionErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_HOST"
  | "INVALID_STATE";

export class StartRoomSessionError extends Error {
  constructor(
    message: string,
    public readonly code: StartRoomSessionErrorCode,
  ) {
    super(message);
    this.name = "StartRoomSessionError";
  }
}

/**
 * Host starts a previously scheduled DB room: PG → live, then Redis session key.
 */
export async function startRoomSessionService(hostUserId: string, roomId: string) {
  const existing = await roomsRepository.findRoomById(roomId);

  if (!existing) {
    throw new StartRoomSessionError("Room not found", "ROOM_NOT_FOUND");
  }

  if (existing.hostUserId !== hostUserId) {
    throw new StartRoomSessionError("Only the host can start this room", "NOT_HOST");
  }

  if (existing.status !== "scheduled") {
    throw new StartRoomSessionError(
      "Room is not scheduled or already started",
      "INVALID_STATE",
    );
  }

  const now = new Date();
  const row = await roomsRepository.markRoomLive(roomId, now);

  if (!row) {
    throw new StartRoomSessionError(
      "Room could not be started (already live or ended)",
      "INVALID_STATE",
    );
  }

  await provisionSessionRoomRedis({
    roomId: row.id,
    hostUserId,
    roomType: row.roomType,
    title: existing.title,
  });

  const invitees = await roomsRepository.listActiveFriendInviteeUserIds(row.id);

  if (invitees.length > 0) {
    await Promise.all(
      invitees.map((invite) =>
        notifyCircleStarted({
          recipientUserId: invite.inviteeUserId,
          actorUserId: hostUserId,
          roomId: row.id,
          roomTitle: existing.title,
        }),
      ),
    );
  }

  return { room: row };
}
