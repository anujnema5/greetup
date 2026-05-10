import type { SnapshotUserProfile } from "@/modules/simple-matching/types";
import { getRedis } from "@/core/redis/client";
import { redisKeys } from "@/core/redis/keys";

// ── Parser utilities ──────────────────────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

export const isRecord = (value: unknown): value is JsonRecord => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const toStringOrNull = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const parseDateToMs = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
};

const unique = (values: string[]): string[] => [...new Set(values)];

const collectNestedIds = (value: unknown, childKey: string): string[] => {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const child = item[childKey];
    if (!isRecord(child)) continue;
    const id = toStringOrNull(child.id);
    if (id) ids.push(id);
  }
  return ids;
};

const buildMatchIds = (interestIds: string[], goalIds: string[], professionIds: string[]): string[] => {
  return unique([
    ...interestIds.map((id) => `interest:${id}`),
    ...goalIds.map((id) => `goal:${id}`),
    ...professionIds.map((id) => `profession:${id}`),
  ]);
};

type SessionPrepFromSnapshot = {
  moodIds: string[];
  lookingForIds: string[];
  connectionPreference: string | null;
};

const parseSessionPrepFromSnapshot = (raw: JsonRecord): SessionPrepFromSnapshot => {
  const cs = raw.currentStatus;
  if (!isRecord(cs)) {
    return { moodIds: [], lookingForIds: [], connectionPreference: null };
  }
  return {
    moodIds: collectNestedIds(cs.moods, "mood"),
    lookingForIds: collectNestedIds(cs.lookingFor, "lookingForOption"),
    connectionPreference: toStringOrNull(cs.connectionPreference),
  };
};

// ── Repository ────────────────────────────────────────────────────────────────

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
      locationPreferenceEnabled:
        typeof preferences.locationPreferenceEnabled === "boolean"
          ? preferences.locationPreferenceEnabled
          : false,
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

/**
 * One round-trip read of `countryCode` from cached snapshot JSON (for pool ordering).
 */
export async function peekCountryCodesByUserIds(userIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (userIds.length === 0) return out;

  const redis = getRedis();
  const keys = userIds.map((id) => redisKeys.snapshot(id));
  const rows = await redis.mget(...keys);

  for (let i = 0; i < userIds.length; i += 1) {
    const uid = userIds[i];
    if (uid === undefined) continue;
    const raw = rows[i];
    if (typeof raw !== "string" || raw.length === 0) {
      out.set(uid, null);
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const loc = isRecord(parsed.location) ? parsed.location : {};
      const cc = typeof loc.countryCode === "string" ? loc.countryCode.trim().toLowerCase() : null;
      out.set(uid, cc && cc.length > 0 ? cc : null);
    } catch {
      out.set(uid, null);
    }
  }
  return out;
}
