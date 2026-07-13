import { getRedis } from "@/core/redis";
import { CONNECTION_CALL_KEYS } from "@/core/redis/keys";
import type { ActiveConnectionCallMeta } from "@/modules/connections/services/connection-call-history.service";

/** Best-effort `conversationId` when the room hash expired but the PG row is still live. */
export async function resolveConnectionCallConversationId(
  roomId: string,
  redisRoom?: Record<string, string>,
): Promise<string | null> {
  const fromHash = redisRoom?.conversationId?.trim();
  if (fromHash) return fromHash;

  const redis = getRedis();
  const activeRaw = await redis.get(CONNECTION_CALL_KEYS.activeByRoom(roomId));
  if (activeRaw) {
    try {
      const meta = JSON.parse(activeRaw) as ActiveConnectionCallMeta;
      if (meta.conversationId) return meta.conversationId;
    } catch {
      /* ignore malformed meta */
    }
  }

  const requestId = await redis.get(CONNECTION_CALL_KEYS.pendingByRoom(roomId));
  if (requestId) {
    const invite = await redis.hgetall(CONNECTION_CALL_KEYS.invite(requestId));
    const fromInvite = invite.conversationId?.trim();
    if (fromInvite) return fromInvite;
  }

  return null;
}
