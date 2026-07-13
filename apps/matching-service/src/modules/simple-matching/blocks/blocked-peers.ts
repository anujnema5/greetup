import { getRedis } from "@/core/redis/client";

const outgoingKey = (userId: string) => `user:blocks:outgoing:${userId}`;
const incomingKey = (userId: string) => `user:blocks:incoming:${userId}`;

/** True when either user has blocked the other (shared Redis sets with main API). */
export async function isBlockedWithPeer(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const redis = getRedis();
  const results = await redis
    .pipeline()
    .sismember(outgoingKey(a), b)
    .sismember(incomingKey(a), b)
    .exec();

  return results?.some((row) => row?.[1] === 1) ?? false;
}

/** Batch filter for pool scans — skips Redis round-trips when the set is empty. */
export async function filterBlockedPeers(
  requesterId: string,
  peerIds: string[],
): Promise<Set<string>> {
  const blocked = new Set<string>();
  if (peerIds.length === 0) return blocked;

  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const peerId of peerIds) {
    if (peerId === requesterId) continue;
    pipeline.sismember(outgoingKey(requesterId), peerId);
    pipeline.sismember(incomingKey(requesterId), peerId);
  }

  const results = await pipeline.exec();
  if (!results) return blocked;

  let idx = 0;
  for (const peerId of peerIds) {
    if (peerId === requesterId) continue;
    const outgoing = results[idx]?.[1] === 1;
    const incoming = results[idx + 1]?.[1] === 1;
    idx += 2;
    if (outgoing || incoming) blocked.add(peerId);
  }

  return blocked;
}
