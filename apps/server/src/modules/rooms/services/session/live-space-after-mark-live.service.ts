import logger from "@/core/logging";
import type { RoomSessionType } from "@/shared/types/room-session";

import { notifySpaceStartedToAssociatedUsers } from "../../notifications";
import { emitSpaceOpenedForJoin } from "@/modules/rooms/socket/space-room-socket.handler";
import { provisionSessionRoomRedis } from "../rtc/session-room-redis.service";

/**
 * Shared follow-up when a space room row becomes `live` from `scheduled`:
 * Redis `room:{id}` session hash + “space is live” notifications for associated users.
 */
export async function runLiveSpaceAfterMarkLive(params: {
  roomId: string;
  hostUserId: string;
  roomType: RoomSessionType;
  title: string;
  notifyInvitees: boolean;
  /** When true, non-host RTC tokens are blocked until the host opens the space. */
  lobbyGateActive: boolean;
}): Promise<void> {
  await provisionSessionRoomRedis({
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    roomType: params.roomType,
    title: params.title,
    lobbyGateActive: params.lobbyGateActive,
  });

  if (!params.lobbyGateActive) {
    await emitSpaceOpenedForJoin(params.roomId, { excludeUserId: params.hostUserId });
  }

  if (!params.notifyInvitees) {
    logger.info("live_space_after_mark_live_completed", {
      roomId: params.roomId,
      hostUserId: params.hostUserId,
      lobbyGateActive: params.lobbyGateActive,
      notifyInvitees: false,
    });
    return;
  }

  const { notifiedCount } = await notifySpaceStartedToAssociatedUsers({
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    roomTitle: params.title,
  });

  logger.info("live_space_after_mark_live_completed", {
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    lobbyGateActive: params.lobbyGateActive,
    notifyInvitees: true,
    notifiedCount,
  });
}
