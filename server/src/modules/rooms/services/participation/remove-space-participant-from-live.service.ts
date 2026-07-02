import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { SPACE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/events/space-room-socket.events";
import { roomInviteRepository } from "@/modules/rooms/repositories/expand-direct-room.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { notifyRtcServiceKickPeer } from "@/modules/rooms/services/rtc/rtc-kick-peer.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

export type SpaceParticipantRemovedReason = "host_removed" | "nsfw";

export type RemoveSpaceParticipantFromLiveOptions = {
  restrict?: boolean;
  /** Who recorded the room restriction (host id or system actor). */
  restrictedByUserId: string;
  socketReason?: SpaceParticipantRemovedReason;
  strikeCount?: number;
};

/**
 * Removes a user from a live space: DB left row, RTC kick, optional room restrict, socket notify.
 * Does not enforce host-only rules — callers validate authorization.
 */
export async function removeSpaceParticipantFromLive(
  roomId: string,
  targetUserId: string,
  options: RemoveSpaceParticipantFromLiveOptions,
): Promise<{ removed: boolean; restricted: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "space") {
    logger.debug("space_participant_remove_skipped", { roomId, targetUserId, reason: "not_space" });
    return { removed: false, restricted: false };
  }

  if (isDbRoomSessionClosed(room)) {
    await clearUserActiveRtcRoom(targetUserId);
    logger.debug("space_participant_remove_skipped", { roomId, targetUserId, reason: "session_closed" });
    return { removed: false, restricted: false };
  }

  if (room.status !== "live") {
    logger.debug("space_participant_remove_skipped", { roomId, targetUserId, reason: "not_live" });
    return { removed: false, restricted: false };
  }

  const activeTarget = await roomParticipantsRepository.isUserRoomParticipant(roomId, targetUserId);
  if (!activeTarget) {
    logger.debug("space_participant_remove_skipped", { roomId, targetUserId, reason: "not_participant" });
    return { removed: false, restricted: false };
  }

  await roomParticipantsRepository.markParticipantLeft(roomId, targetUserId);
  await clearUserActiveRtcRoom(targetUserId);
  await notifyRtcServiceKickPeer(roomId, targetUserId);
  await roomInviteRepository.cancelFriendInviteForRoomInvitee(roomId, targetUserId);

  emitToUser(targetUserId, SPACE_ROOM_SOCKET_EVENTS.participantRemoved, {
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

  logger.info("space_participant_removed_from_live", {
    roomId,
    targetUserId,
    restricted,
    socketReason: options.socketReason ?? "host_removed",
  });
  return { removed: true, restricted };
}
