import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";

import {
  buildPeerTagline,
  initialsFromDisplayName,
  toIsoTimestamp,
} from "../lib/profile-insights-display";
import { profileInsightsRepository } from "../repositories/profile-insights.repository";
import type {
  ProfileInsightsResponse,
  ProfileRecentMatchItem,
} from "../types/profile-insights.types";

const DEFAULT_RECENT_MATCH_LIMIT = 5;
const MAX_RECENT_MATCH_LIMIT = 50;

export type GetProfileInsightsOptions = {
  recentLimit?: number;
};

function resolveDisplayName(user: {
  displayName: string | null;
  name: string;
}): string {
  return user.displayName?.trim() || user.name.trim() || "Someone";
}

function resolveProfessionLabel(profile: { profession: string | null } | null): string | null {
  const label = profile?.profession?.trim();
  return label || null;
}

function resolvePeerImage(user: { image: string | null }): string | null {
  const image = user.image?.trim();
  return image || null;
}

async function readMatchScores(roomIds: string[]): Promise<Map<string, number | null>> {
  const scores = new Map<string, number | null>();
  if (roomIds.length === 0) return scores;

  const redis = getRedis();
  const results = await Promise.all(
    roomIds.map(async (roomId) => {
      const raw = await redis.hget(`${ROOM_KEYS.ROOM}${roomId}`, "matchScore");
      if (!raw) return [roomId, null] as const;
      const parsed = Number(raw);
      return [roomId, Number.isFinite(parsed) ? Math.round(parsed) : null] as const;
    }),
  );

  for (const [roomId, score] of results) {
    scores.set(roomId, score);
  }
  return scores;
}

function dedupeRecentSessions<T extends { peerUserId: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const row of rows) {
    if (seen.has(row.peerUserId)) continue;
    seen.add(row.peerUserId);
    deduped.push(row);
  }
  return deduped;
}

export async function getProfileInsightsService(
  userId: string,
  options: GetProfileInsightsOptions = {},
): Promise<ProfileInsightsResponse> {
  const recentLimit = Math.min(
    MAX_RECENT_MATCH_LIMIT,
    Math.max(1, options.recentLimit ?? DEFAULT_RECENT_MATCH_LIMIT),
  );

  const [
    matchCount,
    connectionCount,
    circleCount,
    profileCompletion,
    recentSessions,
    acceptedPeers,
  ] = await Promise.all([
    profileInsightsRepository.countMatchSessions(userId),
    profileInsightsRepository.countAcceptedConnections(userId),
    profileInsightsRepository.countJoinedCircles(userId),
    profileInsightsRepository.getProfileCompletion(userId),
    profileInsightsRepository.listRecentMatchSessions(userId, recentLimit * 2),
    userConnectionsRepository.findAcceptedPeerIdColumns(userId),
  ]);

  const connectedPeerIds = new Set<string>();
  for (const row of acceptedPeers) {
    connectedPeerIds.add(row.requesterId === userId ? row.addresseeId : row.requesterId);
  }

  const sessions = dedupeRecentSessions(recentSessions).slice(0, recentLimit);
  const peerUserIds = sessions.map((s) => s.peerUserId);
  const [peerUsers, matchScores] = await Promise.all([
    profileInsightsRepository.loadPeerUsers(peerUserIds),
    readMatchScores(sessions.map((s) => s.roomId)),
  ]);

  const peerById = new Map(peerUsers.map((user) => [user.id, user]));

  const recentMatches: ProfileRecentMatchItem[] = sessions.flatMap((session) => {
    const peer = peerById.get(session.peerUserId);
    if (!peer) return [];

    const displayName = resolveDisplayName(peer);
    const professionLabel = resolveProfessionLabel(peer.profile);

    return [
      {
        peerUserId: peer.id,
        displayName,
        tagline: buildPeerTagline({
          professionLabel,
          bio: peer.profile?.bio ?? null,
        }),
        initials: initialsFromDisplayName(displayName),
        image: resolvePeerImage(peer),
        username: peer.username ?? null,
        matchScore: matchScores.get(session.roomId) ?? null,
        matchedAt: toIsoTimestamp(session.matchedAt),
        isConnected: connectedPeerIds.has(peer.id),
      },
    ];
  });

  return {
    stats: {
      matchCount,
      connectionCount,
      circleCount,
      profileCompletion,
    },
    recentMatches,
  };
}
