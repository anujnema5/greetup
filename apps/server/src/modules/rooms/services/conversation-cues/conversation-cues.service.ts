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
import {
  canonicalParticipants,
  filterCuesForUser,
} from "@/modules/rooms/services/conversation-cues/filter-room-cues.util";
import { generateRoomConversationCuesWithGemini } from "@/modules/rooms/services/conversation-cues/generate-conversation-cues-gemini.service";
import { parseProfileSnapshotContext } from "@/modules/rooms/services/conversation-cues/parse-profile-snapshot.util";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";

export const CONVERSATION_CUES_MAX_PER_CALL = 1;

const GENERATION_LOCK_TTL_SEC = 45;
const GENERATION_WAIT_MS = 500;
const GENERATION_MAX_WAIT_ATTEMPTS = 60;

const EMPTY_RESPONSE: ConversationCuesResponseDto = { cue: null, hasMore: false };

function shownCuesRedisKey(roomId: string, userId: string): string {
  return `room:conversation-cues:shown:${roomId}:${userId}`;
}

function cueBatchRedisKey(roomId: string): string {
  return `room:conversation-cues:batch:${roomId}`;
}

function cueBatchLockRedisKey(roomId: string): string {
  return `room:conversation-cues:generating:${roomId}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function readCachedCueBatch(roomId: string): Promise<ConversationCueDto[] | null> {
  const redis = getRedis();
  const raw = await redis.get(cueBatchRedisKey(roomId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ConversationCueDto[];
  } catch {
    return null;
  }
}

async function writeCachedCueBatch(roomId: string, cues: ConversationCueDto[]): Promise<void> {
  const redis = getRedis();
  await redis.set(cueBatchRedisKey(roomId), JSON.stringify(cues), "EX", ROOM_TTL);
}

async function tryAcquireGenerationLock(roomId: string): Promise<boolean> {
  const redis = getRedis();
  const result = await redis.set(
    cueBatchLockRedisKey(roomId),
    "1",
    "EX",
    GENERATION_LOCK_TTL_SEC,
    "NX",
  );
  return result === "OK";
}

async function releaseGenerationLock(roomId: string): Promise<void> {
  await getRedis().del(cueBatchLockRedisKey(roomId));
}

async function waitForCachedCueBatch(roomId: string): Promise<ConversationCueDto[] | null> {
  const redis = getRedis();
  for (let attempt = 0; attempt < GENERATION_MAX_WAIT_ATTEMPTS; attempt++) {
    const cached = await readCachedCueBatch(roomId);
    if (cached && cached.length > 0) return cached;

    const lockHeld = (await redis.exists(cueBatchLockRedisKey(roomId))) === 1;
    if (!lockHeld) return cached;

    await delay(GENERATION_WAIT_MS);
  }

  return readCachedCueBatch(roomId);
}

async function generateAndCacheRoomCueBatch(
  roomId: string,
  profileARaw: unknown,
  profileBRaw: unknown,
): Promise<ConversationCueDto[]> {
  const profileA = parseProfileSnapshotContext(profileARaw);
  const profileB = parseProfileSnapshotContext(profileBRaw);
  if (!profileA || !profileB) return [];

  const candidates = await generateRoomConversationCuesWithGemini(profileA, profileB);
  if (candidates.length > 0) {
    await writeCachedCueBatch(roomId, candidates);
  }

  return candidates;
}

async function resolveCueCandidates(
  roomId: string,
  userId: string,
  peerUserId: string,
  meRaw: unknown,
  peerRaw: unknown,
  shown: Set<string>,
): Promise<ConversationCueDto[]> {
  const participants = canonicalParticipants(userId, peerUserId);
  const { participantA, participantB } = participants;

  let batch = await readCachedCueBatch(roomId);
  if (!batch || batch.length === 0) {
    const lockAcquired = await tryAcquireGenerationLock(roomId);
    if (lockAcquired) {
      try {
        batch = await readCachedCueBatch(roomId);
        if (!batch || batch.length === 0) {
          const [profileARaw, profileBRaw] =
            participantA === userId
              ? [meRaw, peerRaw]
              : [peerRaw, meRaw];
          batch = await generateAndCacheRoomCueBatch(roomId, profileARaw, profileBRaw);
        }
      } finally {
        await releaseGenerationLock(roomId);
      }
    } else {
      batch = await waitForCachedCueBatch(roomId);
    }
  }

  if (!batch || batch.length === 0) return [];

  return filterCuesForUser(batch, userId, participants, shown);
}

/**
 * Returns the next unseen conversation cue for a direct call participant.
 * Cues are generated once per room via Gemini, then cached in Redis.
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

  const candidates = await resolveCueCandidates(
    roomId,
    userId,
    peerUserId,
    meRaw,
    peerRaw,
    shown,
  );
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
