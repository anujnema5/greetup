import { getRedis } from "@/core/redis";
import { ROOM_TTL, USER_CACHE_KEYS } from "@/core/redis/keys";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import {
  RoomActivityError,
  ensureDirectRoomActivityContext,
} from "@/modules/rooms/services/activity/room-activity.service";
import type {
  ConversationCueDto,
  ConversationCuesResponseDto,
} from "@/modules/rooms/services/conversation-cues/conversation-cues.types";
import { generateConversationCuesWithGemini } from "@/modules/rooms/services/conversation-cues/generate-conversation-cues-gemini.service";
import { parseProfileSnapshotContext } from "@/modules/rooms/services/conversation-cues/parse-profile-snapshot.util";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";

export const CONVERSATION_CUES_MAX_PER_CALL = 5;

const EMPTY_RESPONSE: ConversationCuesResponseDto = { cue: null, hasMore: false };

function shownCuesRedisKey(roomId: string, userId: string): string {
  return `room:conversation-cues:shown:${roomId}:${userId}`;
}

function cueBatchRedisKey(roomId: string, userId: string): string {
  return `room:conversation-cues:batch:${roomId}:${userId}`;
}

async function loadRawSnapshot(userId: string): Promise<unknown | null> {
  const redis = getRedis();
  const key = `${USER_CACHE_KEYS.PROFILE_SNAPSHOT}${userId}`;
  let raw = await redis.get(key);
  if (!raw) {
    await ensureProfileSnapshotCached(userId);
    raw = await redis.get(key);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function listShownCueIds(roomId: string, userId: string): Promise<Set<string>> {
  const redis = getRedis();
  const members = await redis.smembers(shownCuesRedisKey(roomId, userId));
  return new Set(members);
}

async function markCueShown(roomId: string, userId: string, cueId: string): Promise<void> {
  const redis = getRedis();
  const key = shownCuesRedisKey(roomId, userId);
  await redis
    .multi()
    .sadd(key, cueId)
    .expire(key, ROOM_TTL)
    .exec();
}

async function readCachedCueBatch(
  roomId: string,
  userId: string,
): Promise<ConversationCueDto[] | null> {
  const redis = getRedis();
  const raw = await redis.get(cueBatchRedisKey(roomId, userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ConversationCueDto[];
  } catch {
    return null;
  }
}

async function writeCachedCueBatch(
  roomId: string,
  userId: string,
  cues: ConversationCueDto[],
): Promise<void> {
  const redis = getRedis();
  await redis.set(cueBatchRedisKey(roomId, userId), JSON.stringify(cues), "EX", ROOM_TTL);
}

async function resolveCueCandidates(
  roomId: string,
  userId: string,
  meRaw: unknown,
  peerRaw: unknown,
  shown: Set<string>,
): Promise<ConversationCueDto[]> {
  const cached = await readCachedCueBatch(roomId, userId);
  if (cached && cached.length > 0) {
    return cached.filter((cue) => !shown.has(cue.id));
  }

  const me = parseProfileSnapshotContext(meRaw);
  const peer = parseProfileSnapshotContext(peerRaw);
  if (!me || !peer) return [];

  const candidates = (await generateConversationCuesWithGemini(me, peer, [...shown])).filter(
    (cue) => !shown.has(cue.id),
  );

  if (candidates.length > 0) {
    await writeCachedCueBatch(roomId, userId, candidates);
  }

  return candidates;
}

/**
 * Returns the next unseen conversation cue for a direct call participant.
 * Cues are generated once per call via Gemini, then cached in Redis.
 */
export async function getNextConversationCueService(
  userId: string,
  roomId: string,
): Promise<ConversationCuesResponseDto> {
  let peerUserId: string;
  try {
    ({ peerUserId } = await ensureDirectRoomActivityContext(roomId, userId));
  } catch (error) {
    if (error instanceof RoomActivityError) {
      throw error;
    }
    throw error;
  }

  if (userId !== peerUserId) {
    const blocked = await userBlocksRepository.isEitherBlocked(userId, peerUserId);
    if (blocked) {
      return EMPTY_RESPONSE;
    }
  }

  const shown = await listShownCueIds(roomId, userId);
  if (shown.size >= CONVERSATION_CUES_MAX_PER_CALL) {
    return EMPTY_RESPONSE;
  }

  const [meRaw, peerRaw] = await Promise.all([
    loadRawSnapshot(userId),
    loadRawSnapshot(peerUserId),
  ]);

  if (!meRaw || !peerRaw) {
    return EMPTY_RESPONSE;
  }

  const candidates = await resolveCueCandidates(roomId, userId, meRaw, peerRaw, shown);
  if (candidates.length === 0) {
    return EMPTY_RESPONSE;
  }

  const cue = candidates[0]!;
  await markCueShown(roomId, userId, cue.id);

  return {
    cue,
    hasMore: candidates.length > 1 && shown.size + 1 < CONVERSATION_CUES_MAX_PER_CALL,
  };
}
