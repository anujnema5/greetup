import type { RoomSessionType } from "@/shared/types/room-session";

import { notifyCircleStarted } from "../notifications";
import { roomsRepository } from "../repositories/rooms.repository";
import { provisionSessionRoomRedis } from "./session-room-redis.service";

/**
 * Shared follow-up when a circle room row becomes `live` from `scheduled`:
 * Redis `room:{id}` session hash + optional friend-invite “circle started” notifications.
 */
export async function runLiveCircleAfterMarkLive(params: {
  roomId: string;
  hostUserId: string;
  roomType: RoomSessionType;
  title: string;
  notifyInvitees: boolean;
  /** When true, non-host RTC tokens are blocked until the host opens the circle. */
  lobbyGateActive: boolean;
}): Promise<void> {
  await provisionSessionRoomRedis({
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    roomType: params.roomType,
    title: params.title,
    lobbyGateActive: params.lobbyGateActive,
  });

  if (!params.notifyInvitees) return;

  const invitees = await roomsRepository.listActiveFriendInviteeUserIds(params.roomId);
  if (invitees.length === 0) return;

  await Promise.all(
    invitees.map((invite) =>
      notifyCircleStarted({
        recipientUserId: invite.inviteeUserId,
        actorUserId: params.hostUserId,
        roomId: params.roomId,
        roomTitle: params.title,
      }),
    ),
  );
}
