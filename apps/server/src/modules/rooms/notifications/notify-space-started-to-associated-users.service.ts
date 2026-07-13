import logger from "@/core/logging";
import { roomInvitesRepository } from "@/modules/rooms/repositories/room-invites.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";

import { collectSpaceStartedRecipientUserIds } from "./collect-space-started-recipients";
import { notifySpaceStarted } from "./notify-space-started.notification";

/**
 * Notifies everyone tied to the circle (friend invites + active participants) when it goes live.
 * Skips the host. Dedupes per user; uses `space_started` notification dedupe keys.
 */
export async function notifySpaceStartedToAssociatedUsers(params: {
  roomId: string;
  hostUserId: string;
  roomTitle: string;
}): Promise<{ notifiedCount: number }> {
  const [invites, participantUserIds] = await Promise.all([
    roomInvitesRepository.listActiveFriendInviteeUserIds(params.roomId),
    roomParticipantsRepository.listActiveParticipantUserIds(params.roomId),
  ]);

  const inviteeUserIds = invites.map((row) => row.inviteeUserId);
  const recipientUserIds = collectSpaceStartedRecipientUserIds(
    params.hostUserId,
    inviteeUserIds,
    participantUserIds,
  );

  if (recipientUserIds.length === 0) {
    logger.debug("space_started_notifications_skipped", {
      roomId: params.roomId,
      hostUserId: params.hostUserId,
      reason: "no_recipients",
    });
    return { notifiedCount: 0 };
  }

  await Promise.all(
    recipientUserIds.map((recipientUserId) =>
      notifySpaceStarted({
        recipientUserId,
        actorUserId: params.hostUserId,
        roomId: params.roomId,
        roomTitle: params.roomTitle,
      }),
    ),
  );

  logger.info("space_started_notifications_dispatched", {
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    notifiedCount: recipientUserIds.length,
  });
  return { notifiedCount: recipientUserIds.length };
}
