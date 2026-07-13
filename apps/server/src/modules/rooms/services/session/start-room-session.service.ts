import logger from "@/core/logging";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";

import { runLiveSpaceAfterMarkLive } from "./live-space-after-mark-live.service";

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

function rejectStartRoomSession(
  hostUserId: string,
  roomId: string,
  message: string,
  code: StartRoomSessionErrorCode,
): never {
  logger.warn("room_session_start_rejected", { hostUserId, roomId, code, message });
  throw new StartRoomSessionError(message, code);
}

/**
 * Host starts a previously scheduled DB room: PG → live, then Redis session key.
 */
export async function startRoomSessionService(hostUserId: string, roomId: string) {
  const access = await assertRoomSessionOpenOnAccess(roomId);
  if (!access.ok) {
    rejectStartRoomSession(hostUserId, roomId, access.message, "INVALID_STATE");
  }

  const existing = await roomsRepository.findRoomById(roomId);

  if (!existing) {
    rejectStartRoomSession(hostUserId, roomId, "Room not found", "ROOM_NOT_FOUND");
  }

  if (existing.hostUserId !== hostUserId) {
    rejectStartRoomSession(hostUserId, roomId, "Only the host can start this room", "NOT_HOST");
  }

  if (existing.status !== "scheduled") {
    rejectStartRoomSession(
      hostUserId,
      roomId,
      "Room is not scheduled or already started",
      "INVALID_STATE",
    );
  }

  const now = new Date();
  const row = await roomSessionsRepository.markRoomLive(roomId, now);

  if (!row) {
    rejectStartRoomSession(
      hostUserId,
      roomId,
      "Room could not be started (already live or ended)",
      "INVALID_STATE",
    );
  }

  const adv = mergeRoomAdvancedOptions(existing.advancedOptions);

  await runLiveSpaceAfterMarkLive({
    roomId: row.id,
    hostUserId,
    roomType: row.roomType,
    title: existing.title,
    notifyInvitees: true,
      lobbyGateActive: adv.shouldHostStartMeeting !== false,
  });

  logger.info("room_session_started", { hostUserId, roomId, roomType: row.roomType });
  return { room: row };
}
