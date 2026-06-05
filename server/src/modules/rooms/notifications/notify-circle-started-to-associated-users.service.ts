import logger from "@/core/logging";
import { roomInvitesRepository } from "@/modules/rooms/repositories/room-invites.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";

import { collectCircleStartedRecipientUserIds } from "./collect-circle-started-recipients";
import { notifyCircleStarted } from "./notify-circle-started.notification";

/**
 * Notifies everyone tied to the circle (friend invites + active participants) when it goes live.
 * Skips the host. Dedupes per user; uses `circle_started` notification dedupe keys.
 */
export async function notifyCircleStartedToAssociatedUsers(params: {
  roomId: string;
  hostUserId: string;
  roomTitle: string;
}): Promise<{ notifiedCount: number }> {
  const [invites, participantUserIds] = await Promise.all([
    roomInvitesRepository.listActiveFriendInviteeUserIds(params.roomId),
    roomParticipantsRepository.listActiveParticipantUserIds(params.roomId),
  ]);

  const inviteeUserIds = invites.map((row) => row.inviteeUserId);
  const recipientUserIds = collectCircleStartedRecipientUserIds(
    params.hostUserId,
    inviteeUserIds,
    participantUserIds,
  );

  if (recipientUserIds.length === 0) {
    logger.debug("circle_started_notifications_skipped", {
      roomId: params.roomId,
      hostUserId: params.hostUserId,
      reason: "no_recipients",
    });
    return { notifiedCount: 0 };
  }

  await Promise.all(
    recipientUserIds.map((recipientUserId) =>
      notifyCircleStarted({
        recipientUserId,
        actorUserId: params.hostUserId,
        roomId: params.roomId,
        roomTitle: params.roomTitle,
      }),
    ),
  );

  logger.info("circle_started_notifications_dispatched", {
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    notifiedCount: recipientUserIds.length,
  });
  return { notifiedCount: recipientUserIds.length };
}
