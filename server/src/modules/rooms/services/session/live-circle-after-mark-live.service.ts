import type { RoomSessionType } from "@/shared/types/room-session";

import { notifyCircleStartedToAssociatedUsers } from "../../notifications";
import { emitCircleOpenedForJoin } from "@/modules/rooms/socket/circle-room-socket.handler";
import { provisionSessionRoomRedis } from "../rtc/session-room-redis.service";

/**
 * Shared follow-up when a circle room row becomes `live` from `scheduled`:
 * Redis `room:{id}` session hash + “circle is live” notifications for associated users.
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

  if (!params.lobbyGateActive) {
    await emitCircleOpenedForJoin(params.roomId, { excludeUserId: params.hostUserId });
  }

  if (!params.notifyInvitees) return;

  await notifyCircleStartedToAssociatedUsers({
    roomId: params.roomId,
    hostUserId: params.hostUserId,
    roomTitle: params.title,
  });
}
