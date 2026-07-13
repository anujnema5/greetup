import { leaveMatchEngineRoom } from "@/modules/matching/services/match-engine-client";
import { notifyMatchPeerSkipped } from "@/modules/matching/services/notify-match-peer-skipped.service";
import { notifyOtcCallPeerEnded } from "@/modules/open-to-connect/services/notify-otc-call-ended.service";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { finalizeConnectionCallRoomSession } from "@/modules/rooms/services/direct/finalize-connection-call-room.service";
import { finalizeDirectMatchRoomSession } from "@/modules/rooms/services/direct/finalize-direct-match-room.service";
import { notifyConnectionCallPeerEnded } from "@/modules/rooms/services/direct/notify-connection-call-peer-ended.service";
import { leaveSpaceRtcSessionInternal } from "@/modules/rooms/services/participation/leave-space-rtc-session.service";
import {
  clearUserActiveRtcRoom,
  getUserActiveRtcRoomId,
} from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

/**
 * Only finalize the RTC room the client was actually connected to.
 * Do not use `findLiveDirectRoomIdForParticipant` — after rematch it can return the
 * brand-new matched room and `finalizeDirectMatchRoomSession` ends it before join.
 */
async function resolveExplicitLeaveRoomId(
  userId: string,
  explicitRoomId?: string | null,
): Promise<string | null> {
  const trimmed = explicitRoomId?.trim();
  if (trimmed) return trimmed;
  return getUserActiveRtcRoomId(userId);
}

async function notifyDirectMatchPeer(roomId: string, leavingUserId: string): Promise<void> {
  const otcNotified = await notifyOtcCallPeerEnded(roomId, leavingUserId);
  if (otcNotified) return;
  await notifyMatchPeerSkipped(roomId, leavingUserId);
}

/**
 * Leave a direct 1:1 room (random match, open-to-connect, or connection call).
 * Handles peer notification, match-engine cleanup, and room finalization.
 */
export async function leaveDirectRoomService(
  userId: string,
  explicitRoomId?: string | null,
): Promise<void> {
  const roomId = await resolveExplicitLeaveRoomId(userId, explicitRoomId);
  const room = roomId ? await roomsRepository.findRoomById(roomId) : null;
  const isConnectionCall = room?.sessionKind === "connection_call";

  if (roomId && room?.roomType === "direct" && room.sessionKind === "match") {
    await notifyDirectMatchPeer(roomId, userId);
  }

  try {
    if (!isConnectionCall) {
      await leaveMatchEngineRoom(userId);
    }
  } finally {
    if (roomId && room) {
      if (room.roomType === "space") {
        await leaveSpaceRtcSessionInternal(userId, roomId);
      } else if (room.sessionKind === "connection_call") {
        await notifyConnectionCallPeerEnded(roomId, userId);
        await roomParticipantsRepository.markParticipantLeft(roomId, userId);
        await finalizeConnectionCallRoomSession(roomId);
      } else if (room.roomType === "direct") {
        await finalizeDirectMatchRoomSession(roomId);
      }
    }
    await clearUserActiveRtcRoom(userId);
  }
}
