import type { SnapshotUserProfile } from "@/contracts/matchmaking.contracts";
import { getRedis } from "@/redis/client";
import { redisKeys } from "@/redis/keys";
import {
  buildMatchIds,
  collectNestedIds,
  isRecord,
  parseDateToMs,
  parseSessionPrepFromSnapshot,
  toNumberOrNull,
  toStringOrNull,
} from "@/matchmaking/infrastructure/parsers/snapshot.parser-utils";

type JsonRecord = Record<string, unknown>;

const parseSnapshot = (raw: JsonRecord, fallbackUserId: string): SnapshotUserProfile => {
  const user = isRecord(raw.user) ? raw.user : {};
  const location = isRecord(raw.location) ? raw.location : {};
  const preferences = isRecord(raw.preferences) ? raw.preferences : {};
  const behavior = isRecord(raw.behavior) ? raw.behavior : {};

  const interestIds = collectNestedIds(raw.interests, "interest");
  const goalIds = collectNestedIds(raw.goals, "goal");
  const professionIds = collectNestedIds(raw.professions, "profession");
  const prep = parseSessionPrepFromSnapshot(raw);
  const userId = toStringOrNull(raw.userId) ?? toStringOrNull(user.id) ?? fallbackUserId;
  const updatedAt =
    parseDateToMs(raw.updatedAt) ??
    parseDateToMs(raw.lastUpdatedAt) ??
    parseDateToMs(raw.createdAt) ??
    Date.now();
  const version = toNumberOrNull(raw.version) ?? 1;

  return {
    userId,
    matchIds: buildMatchIds(interestIds, goalIds, professionIds),
    version,
    updatedAt,
    filters: {
      preferredGender: toStringOrNull(preferences.preferredGender) ?? "any",
      minAge: toNumberOrNull(preferences.minAge) ?? 18,
      maxAge: toNumberOrNull(preferences.maxAge) ?? 99,
      distancePreference: toStringOrNull(preferences.distancePreference) ?? "random",
      countryCode: toStringOrNull(location.countryCode),
      city: toStringOrNull(location.city),
      region: toStringOrNull(location.region),
    },
    attributes: {
      age: toNumberOrNull(raw.age),
      gender: toStringOrNull(raw.gender),
      countryCode: toStringOrNull(location.countryCode),
      city: toStringOrNull(location.city),
      region: toStringOrNull(location.region),
      interestIds,
      goalIds,
      professionIds,
      trustScore: toNumberOrNull(behavior.trustScore) ?? 100,
      sessionMoodIds: prep.moodIds,
      sessionLookingForIds: prep.lookingForIds,
      connectionPreference: prep.connectionPreference,
    },
  };
};

export class SnapshotRepository {
  async getByUserId(userId: string): Promise<SnapshotUserProfile | null> {
    const redis = getRedis();
    const key = redisKeys.snapshot(userId);
    const raw = await redis.get(key);

    if (!raw) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in snapshot key: ${key}`);
    }

    if (!isRecord(parsed)) {
      throw new Error(`Snapshot payload is not an object for key: ${key}`);
    }

    return parseSnapshot(parsed, userId);
  }
}

export const snapshotRepository = new SnapshotRepository();
