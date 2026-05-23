import { emitToUser } from "@/core/socket/socket";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { CIRCLE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/events/circle-room-socket.events";
import { roomInviteRepository } from "@/modules/rooms/repositories/expand-direct-room.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { notifyRtcServiceKickPeer } from "@/modules/rooms/services/rtc/rtc-kick-peer.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

export type CircleParticipantRemovedReason = "host_removed" | "nsfw";

export type RemoveCircleParticipantFromLiveOptions = {
  restrict?: boolean;
  /** Who recorded the room restriction (host id or system actor). */
  restrictedByUserId: string;
  socketReason?: CircleParticipantRemovedReason;
  strikeCount?: number;
};

/**
 * Removes a user from a live circle: DB left row, RTC kick, optional room restrict, socket notify.
 * Does not enforce host-only rules — callers validate authorization.
 */
export async function removeCircleParticipantFromLive(
  roomId: string,
  targetUserId: string,
  options: RemoveCircleParticipantFromLiveOptions,
): Promise<{ removed: boolean; restricted: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") {
    return { removed: false, restricted: false };
  }

  if (isDbRoomSessionClosed(room)) {
    await clearUserActiveRtcRoom(targetUserId);
    return { removed: false, restricted: false };
  }

  if (room.status !== "live") {
    return { removed: false, restricted: false };
  }

  const activeTarget = await roomParticipantsRepository.isUserRoomParticipant(roomId, targetUserId);
  if (!activeTarget) {
    return { removed: false, restricted: false };
  }

  await roomParticipantsRepository.markParticipantLeft(roomId, targetUserId);
  await clearUserActiveRtcRoom(targetUserId);
  await notifyRtcServiceKickPeer(roomId, targetUserId);
  await roomInviteRepository.cancelFriendInviteForRoomInvitee(roomId, targetUserId);

  emitToUser(targetUserId, CIRCLE_ROOM_SOCKET_EVENTS.participantRemoved, {
    roomId,
    reason: options.socketReason ?? "host_removed",
    ...(options.strikeCount != null ? { strikeCount: options.strikeCount } : {}),
  });

  let restricted = false;
  if (options.restrict) {
    await roomRestrictedUsersRepository.addRoomRestrictedUser(
      roomId,
      targetUserId,
      options.restrictedByUserId,
    );
    restricted = true;
  }

  return { removed: true, restricted };
}
