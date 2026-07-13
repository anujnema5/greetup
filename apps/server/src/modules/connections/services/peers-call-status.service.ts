import logger from "@/core/logging";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { getUsersActiveRtcRooms } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { resolveUsersOnlineFlags } from "@/modules/presence/services/resolve-users-online-flags.service";

export type PeerCallStatusDto = {
  isOnline: boolean;
  inLiveRoom: boolean;
  liveRoomId: string | null;
  liveRoomTitle: string | null;
};

/**
 * Batch: socket presence plus who is **actually in an SFU call** (see `getUsersActiveRtcRooms` — not
 * `room_participants` / `rooms.status`, which stay “live” and leave `left_at` unset too often).
 */
export async function peersCallStatusForUser(
  _viewerUserId: string,
  peerUserIds: string[],
): Promise<Record<string, PeerCallStatusDto>> {
  const unique = [...new Set(peerUserIds.filter((id) => typeof id === "string" && id.length > 0))];
  const out: Record<string, PeerCallStatusDto> = {};
  for (const id of unique) {
    out[id] = {
      isOnline: false,
      inLiveRoom: false,
      liveRoomId: null,
      liveRoomTitle: null,
    };
  }
  if (unique.length === 0) return out;

  const [onlineByUser, activeRoomByUser] = await Promise.all([
    resolveUsersOnlineFlags(unique),
    getUsersActiveRtcRooms(unique),
  ]);

  for (const id of unique) {
    out[id]!.isOnline = onlineByUser.get(id) === true;
  }

  const roomIds = [...new Set(activeRoomByUser.values())];
  const titleByRoomId = await roomsRepository.findRoomTitlesByIds(roomIds);

  for (const id of unique) {
    const rid = activeRoomByUser.get(id);
    if (!rid) continue;
    const cur = out[id];
    if (!cur) continue;
    cur.inLiveRoom = true;
    cur.liveRoomId = rid;
    cur.liveRoomTitle = titleByRoomId.get(rid) ?? null;
  }

  logger.debug("peers_call_status_resolved", {
    viewerUserId: _viewerUserId,
    peerCount: unique.length,
    onlineCount: unique.filter((id) => out[id]?.isOnline).length,
    inLiveRoomCount: unique.filter((id) => out[id]?.inLiveRoom).length,
  });

  return out;
}
