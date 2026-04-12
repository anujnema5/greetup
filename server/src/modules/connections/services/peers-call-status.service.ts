import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { getUsersActiveRtcRooms } from "@/modules/rooms/services/user-active-rtc-room-redis.service";

export type PeerCallStatusDto = {
  isOnline: boolean;
  inLiveRoom: boolean;
  liveRoomId: string | null;
  liveRoomTitle: string | null;
};

/**
 * Batch: which peers are socket-online and who is **currently in a call** (active RTC token / SFU session).
 *
 * We do **not** use `room_participants` + `rooms.status = live` alone — match rows often stay `live` with
 * `left_at` unset after people leave, which falsely marked everyone as “in a call”.
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

  const redis = getRedis();
  const pipe = redis.pipeline();
  for (const id of unique) {
    pipe.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, id);
  }
  const presenceRaw = await pipe.exec();
  unique.forEach((id, i) => {
    const tuple = presenceRaw?.[i];
    const n = Array.isArray(tuple) ? tuple[1] : tuple;
    out[id]!.isOnline = n === 1 || n === true || n === "1";
  });

  const activeRoomByUser = await getUsersActiveRtcRooms(unique);
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

  return out;
}
