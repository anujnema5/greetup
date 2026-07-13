import { getRedis } from "@/core/redis";
import { MATCHING_PEER_KEYS } from "@/core/redis/keys";
import { getAcceptedPeerIdsForUser } from "@/modules/connections/services/accepted-peer-ids.service";

async function addPeer(userId: string, peerUserId: string): Promise<void> {
  if (userId === peerUserId) return;
  await getRedis().sadd(MATCHING_PEER_KEYS.connectionPeers(userId), peerUserId);
}

async function removePeer(userId: string, peerUserId: string): Promise<void> {
  await getRedis().srem(MATCHING_PEER_KEYS.connectionPeers(userId), peerUserId);
}

/** Bidirectional add when a connection becomes accepted. */
export async function addMatchingConnectionPeers(userA: string, userB: string): Promise<void> {
  await Promise.all([addPeer(userA, userB), addPeer(userB, userA)]);
}

/** Bidirectional remove when an accepted connection ends. */
export async function removeMatchingConnectionPeers(userA: string, userB: string): Promise<void> {
  await Promise.all([removePeer(userA, userB), removePeer(userB, userA)]);
}

/** Rebuild the Redis set from Postgres — used on socket connect for backfill. */
export async function syncMatchingConnectionPeersFromDatabase(userId: string): Promise<void> {
  const peerIds = await getAcceptedPeerIdsForUser(userId);
  const redis = getRedis();
  const key = MATCHING_PEER_KEYS.connectionPeers(userId);
  const pipeline = redis.pipeline();
  pipeline.del(key);
  if (peerIds.size > 0) {
    pipeline.sadd(key, ...peerIds);
  }
  await pipeline.exec();
}
