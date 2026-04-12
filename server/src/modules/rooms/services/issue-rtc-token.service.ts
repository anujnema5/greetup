import { signRtcJwtForRoom } from "@/core/rtc/rtc-jwt";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import {
  getOrCreateRoomConversation,
  ensureRoomConversationParticipant,
} from "@/modules/chat/services/room-conversation.service";

export class IssueRtcTokenError extends Error {
  constructor(
    message: string,
    public readonly code: IssueRtcTokenErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "IssueRtcTokenError";
  }
}

export type IssueRtcTokenErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "NOT_ALLOWED"
  | "UNSUPPORTED_ROOM_TYPE";

/**
 * Issues a JWT for rtc-service for **direct** or **circle** rooms.
 * Caller must be host or in `room_participants`; room must be **live**.
 */
export async function issueRtcTokenService(userId: string, roomId: string) {
  const room = await roomsRepository.findRoomById(roomId);

  if (!room) {
    throw new IssueRtcTokenError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  const { roomType } = room;
  if (roomType !== "direct" && roomType !== "circle") {
    throw new IssueRtcTokenError(
      "RTC token is not supported for this room type",
      "UNSUPPORTED_ROOM_TYPE",
      400,
    );
  }

  if (room.status !== "live") {
    throw new IssueRtcTokenError("Room is not live yet", "ROOM_NOT_LIVE", 400);
  }

  const isHost = room.hostUserId === userId;
  const isParticipant = isHost || (await roomsRepository.isUserRoomParticipant(roomId, userId));

  if (!isParticipant) {
    throw new IssueRtcTokenError(
      "You are not allowed to join this room",
      "NOT_ALLOWED",
      403,
    );
  }

  const { token, expiresInSec } = await signRtcJwtForRoom({
    userId,
    roomId,
    roomType,
  });

  // Auto-create room conversation and ensure this user is a participant
  const conversationId = await getOrCreateRoomConversation(roomId, roomType, room.hostUserId);
  await ensureRoomConversationParticipant(roomId, userId);

  return {
    token,
    expiresInSec,
    roomId,
    roomType,
    conversationId,
  };
}
