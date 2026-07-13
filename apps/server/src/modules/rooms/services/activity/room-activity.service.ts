import type { InferSelectModel } from "drizzle-orm";

import logger from "@/core/logging";
import { rooms } from "@/core/database/schema";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";

export type RoomActivityErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "NOT_DIRECT"
  | "NOT_PARTICIPANT"
  | "PEER_NOT_FOUND";

export class RoomActivityError extends Error {
  constructor(
    message: string,
    public readonly code: RoomActivityErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "RoomActivityError";
  }
}

export type DirectRoomActivityContext = {
  room: InferSelectModel<typeof rooms>;
  participants: string[];
  peerUserId: string;
};

function rejectRoomActivity(
  userId: string,
  roomId: string,
  message: string,
  code: RoomActivityErrorCode,
  statusCode: number,
): never {
  logger.warn("room_activity_rejected", { userId, roomId, code, message });
  throw new RoomActivityError(message, code, statusCode);
}

/**
 * Shared room-activity guardrail for 1:1 activities.
 * Keeps "direct + live + participant + peer exists" checks in one place.
 */
export async function ensureDirectRoomActivityContext(
  roomId: string,
  userId: string,
): Promise<DirectRoomActivityContext> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    rejectRoomActivity(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.status !== "live") {
    rejectRoomActivity(userId, roomId, "Room is not live", "ROOM_NOT_LIVE", 400);
  }
  if (room.roomType !== "direct") {
    rejectRoomActivity(
      userId,
      roomId,
      "Activities are available only in direct calls",
      "NOT_DIRECT",
      400,
    );
  }

  const isParticipant = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);
  if (!isParticipant) {
    rejectRoomActivity(userId, roomId, "You are not in this room", "NOT_PARTICIPANT", 403);
  }

  const participants = await roomParticipantsRepository.listActiveParticipantUserIds(roomId);
  const peerUserId = participants.find((id) => id !== userId);
  if (!peerUserId) {
    rejectRoomActivity(
      userId,
      roomId,
      "No active peer found in this direct call",
      "PEER_NOT_FOUND",
      400,
    );
  }

  return { room, participants, peerUserId };
}
