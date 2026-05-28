import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { users } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { USER_CACHE_KEYS, USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";
import {
  resolveConnectionForPublicProfile,
  type PublicProfileConnectionState,
} from "@/modules/profile/lib/resolve-public-profile-connection";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";
import { generateMatchInsight, type InsightProfileSnapshot } from "./match-insight.service";

export type MatchPeerPreview = {
  displayName: string;
  /** Primary profession label from profile snapshot. */
  profession: string | null;
  headline: string | null;
  initials: string;
  interestTags: string[];
  moreInterestsCount: number;
  image?: string;
  isOnline: boolean;
  insight: string | null;
  username: string | null;
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
};

type SnapshotInterest = { interest?: { displayName?: string | null; name?: string | null } | null };
type SnapshotProfession = { profession?: { displayName?: string | null; name?: string | null } | null };
type SnapshotGoal = { goal?: { displayName?: string | null; name?: string | null } | null };
type SnapshotMood = { mood?: { displayName?: string | null; name?: string | null } | null };
type SnapshotLookingFor = { lookingForOption?: { displayName?: string | null; name?: string | null } | null };

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

type ParsedSnapshot = {
  displayName: string;
  bio: string;
  age?: number;
  image?: string;
  interests: string[];
  goals: string[];
  professions: string[];
  moods: string[];
  lookingFor: string[];
  preview: {
    headline: string | null;
    initials: string;
    interestTags: string[];
    moreInterestsCount: number;
  };
} | null;

function parseSnapshotData(data: unknown): ParsedSnapshot {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  const user = o.user as Record<string, unknown> | undefined;
  const displayNameRaw =
    (typeof user?.displayName === "string" && user.displayName.trim()) ||
    (typeof user?.name === "string" && user.name.trim()) ||
    "Someone";

  const age = typeof user?.age === "number" ? user.age : undefined;
  const image = typeof user?.image === "string" && user.image.trim() ? user.image.trim() : undefined;
  const bio = typeof o.bio === "string" ? o.bio.trim().split("\n")[0]?.trim() ?? "" : "";
  const professions = Array.isArray(o.professions) ? (o.professions as SnapshotProfession[]) : [];
  const goals = Array.isArray(o.goals) ? (o.goals as SnapshotGoal[]) : [];
  const interests = Array.isArray(o.interests) ? (o.interests as SnapshotInterest[]) : [];

  const currentStatus = o.currentStatus as Record<string, unknown> | undefined;
  const rawMoods = Array.isArray(currentStatus?.moods) ? (currentStatus.moods as SnapshotMood[]) : [];
  const rawLookingFor = Array.isArray(currentStatus?.lookingFor) ? (currentStatus.lookingFor as SnapshotLookingFor[]) : [];

  const moodLabels: string[] = [];
  for (const row of rawMoods) {
    const lab = labelFromRelation(row.mood ?? null);
    if (lab) moodLabels.push(lab);
  }

  const lookingForLabels: string[] = [];
  for (const row of rawLookingFor) {
    const lab = labelFromRelation(row.lookingForOption ?? null);
    if (lab) lookingForLabels.push(lab);
  }

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

  const interestLabels: string[] = [];
  for (const row of interests) {
    const lab = labelFromRelation(row.interest ?? null);
    if (lab) interestLabels.push(lab);
  }

  const goalLabels: string[] = [];
  for (const row of goals) {
    const lab = labelFromRelation(row.goal ?? null);
    if (lab) goalLabels.push(lab);
  }

  const professionLabels: string[] = [];
  for (const row of professions) {
    const lab = labelFromRelation(row.profession ?? null);
    if (lab) professionLabels.push(lab);
  }

  const visible = interestLabels.slice(0, 3);
  const moreInterestsCount = Math.max(0, interestLabels.length - visible.length);

  return {
    displayName: displayNameRaw,
    bio,
    age,
    interests: interestLabels,
    goals: goalLabels,
    professions: professionLabels,
    moods: moodLabels,
    lookingFor: lookingForLabels,
    image,
    preview: { headline, initials: initialsFromName(displayNameRaw), interestTags: visible, moreInterestsCount },
  };
}

async function fetchSnapshot(userId: string): Promise<unknown> {
  const redis = getRedis();
  const key = `${USER_CACHE_KEYS.PROFILE_SNAPSHOT}${userId}`;
  let raw = await redis.get(key);
  if (!raw) {
    await ensureProfileSnapshotCached(userId);
    raw = await redis.get(key);
  }
  return raw ? parseSnapshot(raw) : null;
}

function fallback(_peerUserId: string, isOnline: boolean): MatchPeerPreview {
  return {
    displayName: "Someone",
    profession: null,
    headline: null,
    initials: "?",
    interestTags: [],
    moreInterestsCount: 0,
    isOnline,
    insight: null,
    username: null,
    connectionState: "none",
    connectionId: null,
  };
}

async function fetchPeerSocialMeta(viewerId: string, peerUserId: string) {
  const [userRow, connectionRows] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, peerUserId),
      columns: { username: true },
    }),
    viewerId === peerUserId
      ? Promise.resolve([])
      : userConnectionsRepository.findAllBetween(viewerId, peerUserId),
  ]);

  const { connectionState, connectionId } = resolveConnectionForPublicProfile(
    connectionRows.map((row) => ({
      id: row.id,
      requesterId: row.requesterId,
      addresseeId: row.addresseeId,
      status: row.status,
    })),
    viewerId,
  );

  return {
    username: userRow?.username ?? null,
    connectionState,
    connectionId,
  };
}

export async function getMatchPeerPreview(
  myUserId: string,
  peerUserId: string,
): Promise<MatchPeerPreview> {
  const redis = getRedis();

  const [myRaw, peerRaw, isOnline, social] = await Promise.all([
    fetchSnapshot(myUserId),
    fetchSnapshot(peerUserId),
    redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, peerUserId).then((v) => v === 1),
    fetchPeerSocialMeta(myUserId, peerUserId),
  ]);

  const peerData = parseSnapshotData(peerRaw);
  if (!peerData) return fallback(peerUserId, isOnline);

  const myData = parseSnapshotData(myRaw);

  const meForInsight: InsightProfileSnapshot = myData
    ? { displayName: myData.displayName, bio: myData.bio, interests: myData.interests, goals: myData.goals, professions: myData.professions }
    : { displayName: "User", interests: [], goals: [], professions: [] };

  const peerForInsight: InsightProfileSnapshot = {
    displayName: peerData.displayName,
    bio: peerData.bio,
    age: peerData.age,
    interests: peerData.interests,
    goals: peerData.goals,
    professions: peerData.professions,
    moods: peerData.moods,
    lookingFor: peerData.lookingFor,
  };

  // const insight = await generateMatchInsight(meForInsight, peerForInsight);

  const profession = peerData.professions[0] ?? null;

  return {
    displayName: peerData.displayName,
    profession,
    headline: peerData.preview.headline,
    initials: peerData.preview.initials,
    interestTags: peerData.preview.interestTags,
    moreInterestsCount: peerData.preview.moreInterestsCount,
    isOnline,
    insight: "",
    image: peerData.image,
    username: social.username,
    connectionState: social.connectionState,
    connectionId: social.connectionId,
  };
}
