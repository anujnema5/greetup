import { getRedis } from "@/core/redis";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { getUsersActiveRtcRooms } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

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

  const redis = getRedis();
  const pipe = redis.pipeline();
  for (const id of unique) {
    pipe.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, id);
  }
  const presenceRows = await pipe.exec();
  unique.forEach((id, i) => {
    const n = pipelineValue(presenceRows, i);
    out[id]!.isOnline = redisSismemberTrue(n);
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

function pipelineValue(rows: unknown[][] | null | undefined, index: number): unknown {
  const row = rows?.[index];
  return Array.isArray(row) ? row[1] : undefined;
}

function redisSismemberTrue(val: unknown): boolean {
  return val === 1 || val === true || val === "1";
}
