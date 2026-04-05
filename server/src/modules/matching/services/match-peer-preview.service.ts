import { getRedis } from "@/core/redis";
import { USER_CACHE_KEYS, USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";

export type MatchPeerPreview = {
  displayName: string;
  headline: string | null;
  initials: string;
  interestTags: string[];
  moreInterestsCount: number;
  isOnline: boolean;
};

type SnapshotInterest = { interest?: { displayName?: string | null; name?: string | null } | null };
type SnapshotProfession = { profession?: { displayName?: string | null; name?: string | null } | null };
type SnapshotGoal = { goal?: { displayName?: string | null; name?: string | null } | null };

function labelFromRelation(
  row: { displayName?: string | null; name?: string | null } | null | undefined,
): string | null {
  if (!row) return null;
  const d = row.displayName?.trim();
  if (d) return d;
  const n = row.name?.trim();
  return n || null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return parts[0]?.[0]?.toUpperCase() ?? "?";
}

function parseSnapshot(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function buildPreviewFromSnapshot(data: unknown): MatchPeerPreview | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  const user = o.user as Record<string, unknown> | undefined;
  const displayNameRaw =
    (typeof user?.displayName === "string" && user.displayName.trim()) ||
    (typeof user?.name === "string" && user.name.trim()) ||
    "Someone";

  const bio = typeof o.bio === "string" ? o.bio.trim().split("\n")[0]?.trim() ?? "" : "";
  const professions = Array.isArray(o.professions) ? (o.professions as SnapshotProfession[]) : [];
  const goals = Array.isArray(o.goals) ? (o.goals as SnapshotGoal[]) : [];
  const interests = Array.isArray(o.interests) ? (o.interests as SnapshotInterest[]) : [];

  const p0 = labelFromRelation(professions[0]?.profession ?? null);
  const g0 = labelFromRelation(goals[0]?.goal ?? null);

  let headline: string | null = null;
  if (bio.length > 0) {
    headline = bio.length > 90 ? `${bio.slice(0, 87)}…` : bio;
  } else if (p0 && g0) {
    headline = `${p0} · ${g0}`;
  } else if (p0) {
    headline = p0;
  } else if (g0) {
    headline = g0;
  }

  const interestTags: string[] = [];
  for (const row of interests) {
    const lab = labelFromRelation(row.interest ?? null);
    if (lab) interestTags.push(lab);
  }

  const visible = interestTags.slice(0, 3);
  const moreInterestsCount = Math.max(0, interestTags.length - visible.length);

  return {
    displayName: displayNameRaw,
    headline,
    initials: initialsFromName(displayNameRaw),
    interestTags: visible,
    moreInterestsCount,
    isOnline: false,
  };
}

export async function getMatchPeerPreview(peerUserId: string): Promise<MatchPeerPreview | null> {
  const redis = getRedis();
  const key = `${USER_CACHE_KEYS.PROFILE_SNAPSHOT}${peerUserId}`;
  let raw = await redis.get(key);

  if (!raw) {
    await ensureProfileSnapshotCached(peerUserId);
    raw = await redis.get(key);
  }

  if (!raw) {
    return {
      displayName: "Someone",
      headline: null,
      initials: "?",
      interestTags: [],
      moreInterestsCount: 0,
      isOnline: (await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, peerUserId)) === 1,
    };
  }

  const parsed = parseSnapshot(raw);
  const preview = buildPreviewFromSnapshot(parsed);
  if (!preview) {
    return {
      displayName: "Someone",
      headline: null,
      initials: "?",
      interestTags: [],
      moreInterestsCount: 0,
      isOnline: (await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, peerUserId)) === 1,
    };
  }

  preview.isOnline = (await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, peerUserId)) === 1;
  return preview;
}
