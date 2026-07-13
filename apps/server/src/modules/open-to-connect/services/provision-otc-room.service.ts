import { randomUUID } from "crypto";

import { getRedis } from "@/core/redis";
import { ROOM_KEYS, ROOM_TTL } from "@/core/redis/keys";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";
import { roomCreationRepository } from "@/modules/rooms/repositories/room-creation.repository";
import { syncGuestMatchRoomSessionCap } from "@/modules/rooms/services/session/sync-guest-match-room-session-cap.service";
import { AppError } from "@/shared/errors";

export async function provisionOpenToConnectRoom(
  requesterUserId: string,
  targetUserId: string,
  connectRequestId: string,
): Promise<string> {
  const category = await roomCategoriesRepository.findActiveCategoryBySlug("match");
  if (!category) {
    throw new AppError("Match category not configured", 503, "SERVICE_UNAVAILABLE");
  }

  const roomId = randomUUID();
  await roomCreationRepository.createMatchPairRoom({
    roomId,
    hostUserId: requesterUserId,
    peerUserId: targetUserId,
    categoryId: category.id,
  });
  await syncGuestMatchRoomSessionCap(roomId);

  const redis = getRedis();
  const key = `${ROOM_KEYS.ROOM}${roomId}`;
  await redis.hset(key, {
    sessionKind: "match",
    roomId,
    attemptId: connectRequestId,
    pairId: connectRequestId,
    userA: requesterUserId,
    userB: targetUserId,
    openToConnectOrigin: "true",
    createdAt: Date.now(),
  });
  await redis.expire(key, ROOM_TTL);

  return roomId;
}
