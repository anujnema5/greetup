import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";

import { runLiveCircleAfterMarkLive } from "./live-circle-after-mark-live.service";

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
  const access = await assertRoomSessionOpenOnAccess(roomId);
  if (!access.ok) {
    throw new StartRoomSessionError(access.message, "INVALID_STATE");
  }

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
  const row = await roomSessionsRepository.markRoomLive(roomId, now);

  if (!row) {
    throw new StartRoomSessionError(
      "Room could not be started (already live or ended)",
      "INVALID_STATE",
    );
  }

  const adv = mergeRoomAdvancedOptions(existing.advancedOptions);

  await runLiveCircleAfterMarkLive({
    roomId: row.id,
    hostUserId,
    roomType: row.roomType,
    title: existing.title,
    notifyInvitees: true,
      lobbyGateActive: adv.shouldHostStartMeeting !== false,
  });

  return { room: row };
}
