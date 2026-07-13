import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { getUserMatchStateService } from "@/modules/matching/services/matchmaking.service";
import { AppError } from "@/shared/errors";

import { SEARCH_SUGGESTIONS_LIMIT } from "../constants";
import { isEligibleNoMatchReasonForSuggestions } from "../lib/search-suggestions-eligibility";
import { getRecentNoMatchReasonForSuggestions } from "./otc-recent-no-match.service";
import { openToConnectDiscoveryRepository } from "../repositories/open-to-connect-discovery.repository";
import { otcRedisIndexService } from "./otc-redis-index.service";
import type { OpenToConnectFeedItemDto, OpenToConnectFeedResultDto } from "../types";

const DEFAULT_FEED_LIMIT = 12;
const MAX_FEED_LIMIT = 40;
const SIDEBAR_LIMIT = 8;

type FeedQuery = {
  activityId?: string;
  interestId?: string;
  cursor?: string;
  limit?: number;
};

type RankedCandidate = {
  userId: string;
  profileId: string;
  score: number;
  sharedInterestCount: number;
  updatedAtMs: number;
  headline: string | null;
  interestIds: string[];
};

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      offset?: number;
    };
    return typeof parsed.offset === "number" && parsed.offset >= 0 ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function countSharedInterests(viewerInterestIds: Set<string>, peerInterestIds: string[]): number {
  let count = 0;
  for (const id of peerInterestIds) {
    if (viewerInterestIds.has(id)) count += 1;
  }
  return count;
}

function listSharedInterestLabels(
  viewerInterestIds: string[],
  peerInterestIds: string[],
  labelsById: Map<string, string>,
): string[] {
  const peerSet = new Set(peerInterestIds);
  const labels: string[] = [];
  for (const id of viewerInterestIds) {
    if (!peerSet.has(id)) continue;
    const label = labelsById.get(id);
    if (label) labels.push(label);
  }
  return labels;
}

function countSharedActivities(searcherActivityIds: Set<string>, peerActivityIds: string[]): number {
  let count = 0;
  for (const id of peerActivityIds) {
    if (searcherActivityIds.has(id)) count += 1;
  }
  return count;
}

function rankSearchSuggestionCandidates(
  searcherActivityIds: Set<string>,
  viewerInterestIds: Set<string>,
  tagsByUserId: Map<string, { interestIds: string[]; activityIds: string[]; updatedAt: string; headline: string | null; profileId: string }>,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];
  for (const [userId, tags] of tagsByUserId) {
    const sharedInterestCount = countSharedInterests(viewerInterestIds, tags.interestIds);
    const sharedActivityCount = countSharedActivities(searcherActivityIds, tags.activityIds);
    const updatedAtMs = Date.parse(tags.updatedAt) || 0;
    ranked.push({
      userId,
      profileId: tags.profileId,
      sharedInterestCount,
      updatedAtMs,
      headline: tags.headline,
      interestIds: tags.interestIds,
      score: sharedActivityCount * 20 + sharedInterestCount * 10 + (tags.activityIds.length > 0 ? 2 : 0),
    });
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.updatedAtMs !== a.updatedAtMs) return b.updatedAtMs - a.updatedAtMs;
    return a.userId.localeCompare(b.userId);
  });
  return ranked;
}

async function assertSearcherEligibleForSuggestions(userId: string): Promise<void> {
  const state = await getUserMatchStateService(userId);
  if (state.status === "searching") {
    return;
  }

  if (state.status === "no_match") {
    return;
  }

  const recentReason = await getRecentNoMatchReasonForSuggestions(userId);
  if (recentReason && isEligibleNoMatchReasonForSuggestions(recentReason)) {
    return;
  }

  throw new AppError("Suggestions are only available during an active search", 409, "CONFLICT");
}

async function listCandidateIdsForSearcher(searcherActivityIds: string[]): Promise<string[]> {
  if (searcherActivityIds.length === 0) {
    return otcRedisIndexService.listIndexedUserIds();
  }
  const sets = await Promise.all(
    searcherActivityIds.map((activityId) => otcRedisIndexService.listIndexedUserIds(activityId)),
  );
  const merged = new Set<string>();
  for (const ids of sets) {
    for (const id of ids) merged.add(id);
  }
  if (merged.size === 0) {
    return otcRedisIndexService.listIndexedUserIds();
  }
  return [...merged];
}

function rankCandidates(
  viewerInterestIds: Set<string>,
  tagsByUserId: Map<string, { interestIds: string[]; updatedAt: string; headline: string | null; profileId: string }>,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];
  for (const [userId, tags] of tagsByUserId) {
    const sharedInterestCount = countSharedInterests(viewerInterestIds, tags.interestIds);
    const updatedAtMs = Date.parse(tags.updatedAt) || 0;
    ranked.push({
      userId,
      profileId: tags.profileId,
      sharedInterestCount,
      updatedAtMs,
      headline: tags.headline,
      interestIds: tags.interestIds,
      score: sharedInterestCount * 10 + (tags.interestIds.length > 0 ? 1 : 0),
    });
  }
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.updatedAtMs !== a.updatedAtMs) return b.updatedAtMs - a.updatedAtMs;
    return a.userId.localeCompare(b.userId);
  });
  return ranked;
}

async function buildFeedResult(
  viewerId: string,
  query: FeedQuery,
  hardLimit: number,
): Promise<OpenToConnectFeedResultDto> {
  const limit = Math.min(MAX_FEED_LIMIT, Math.max(1, query.limit ?? hardLimit));
  const offset = decodeCursor(query.cursor);

  const [indexedIds, blockedPeerIds, viewerInterestIds] = await Promise.all([
    otcRedisIndexService.listIndexedUserIds(query.activityId),
    userBlocksRepository.listAllBlockedPeerIds(viewerId),
    openToConnectDiscoveryRepository.listViewerInterestIds(viewerId),
  ]);

  const blocked = new Set(blockedPeerIds);
  const candidateIds = indexedIds.filter((id) => id !== viewerId && !blocked.has(id));
  const visibleIds = await otcRedisIndexService.filterStillVisibleUserIds(candidateIds);
  const tagsByUserId = await otcRedisIndexService.readTagsForUsers(visibleIds);

  const tagMap = new Map<
    string,
    { interestIds: string[]; updatedAt: string; headline: string | null; profileId: string }
  >();
  for (const [userId, tags] of tagsByUserId) {
    tagMap.set(userId, {
      interestIds: tags.interestIds,
      updatedAt: tags.updatedAt,
      headline: tags.headline,
      profileId: tags.profileId,
    });
  }

  let ranked = rankCandidates(new Set(viewerInterestIds), tagMap);
  if (query.interestId) {
    ranked = ranked.filter((row) => row.interestIds.includes(query.interestId!));
  }

  const pageRows = ranked.slice(offset, offset + limit);
  const nextOffset = offset + pageRows.length;
  const hasMore = nextOffset < ranked.length;

  const profileRows = await openToConnectDiscoveryRepository.loadUserProfilesByUserIds(
    pageRows.map((row) => row.userId),
  );
  const profileByUserId = new Map(profileRows.map((row) => [row.userId, row]));
  const profileIds = pageRows.map((row) => row.profileId).filter(Boolean);
  const [activitiesByProfileId, lookingForByProfileId, professionByProfileId] =
    await Promise.all([
      openToConnectDiscoveryRepository.loadActivitiesByProfileIds(profileIds),
      openToConnectDiscoveryRepository.loadLookingForLabelsByProfileIds(profileIds),
      openToConnectDiscoveryRepository.loadProfessionLabelsByProfileIds(profileIds),
    ]);

  const interestLabelIds = new Set(viewerInterestIds);
  for (const row of pageRows) {
    for (const id of row.interestIds) interestLabelIds.add(id);
  }
  const interestLabelsById = await openToConnectDiscoveryRepository.loadInterestLabelsByIds([
    ...interestLabelIds,
  ]);

  const items: OpenToConnectFeedItemDto[] = [];
  for (const row of pageRows) {
    const profile = profileByUserId.get(row.userId);
    if (!profile) continue;
    const sharedInterests = listSharedInterestLabels(
      viewerInterestIds,
      row.interestIds,
      interestLabelsById,
    );
    items.push({
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      name: profile.name,
      image: profile.image,
      headline: row.headline,
      activities: activitiesByProfileId.get(profile.profileId) ?? [],
      lookingFor: lookingForByProfileId.get(profile.profileId) ?? [],
      profession: professionByProfileId.get(profile.profileId) ?? null,
      sharedInterestCount: row.sharedInterestCount,
      sharedInterests,
      isOnline: true,
    });
  }

  return {
    items,
    nextCursor: hasMore ? encodeCursor(nextOffset) : null,
    limit,
  };
}

export async function getOpenToConnectFeedService(
  viewerId: string,
  query: FeedQuery,
): Promise<OpenToConnectFeedResultDto> {
  return buildFeedResult(viewerId, query, DEFAULT_FEED_LIMIT);
}

export async function getOpenToConnectSidebarService(
  viewerId: string,
  query: Pick<FeedQuery, "activityId" | "interestId"> = {},
): Promise<OpenToConnectFeedResultDto> {
  return buildFeedResult(viewerId, { ...query, limit: SIDEBAR_LIMIT }, SIDEBAR_LIMIT);
}

export async function getOpenToConnectSearchSuggestionsService(
  viewerId: string,
): Promise<OpenToConnectFeedResultDto> {
  await assertSearcherEligibleForSuggestions(viewerId);

  const [blockedPeerIds, viewerInterestIds, searcherActivityIds] = await Promise.all([
    userBlocksRepository.listAllBlockedPeerIds(viewerId),
    openToConnectDiscoveryRepository.listViewerInterestIds(viewerId),
    openToConnectDiscoveryRepository.listViewerActivityIds(viewerId),
  ]);

  const blocked = new Set(blockedPeerIds);
  const indexedIds = await listCandidateIdsForSearcher(searcherActivityIds);
  const candidateIds = indexedIds.filter((id) => id !== viewerId && !blocked.has(id));
  const visibleIds = await otcRedisIndexService.filterStillVisibleUserIds(candidateIds);
  const tagsByUserId = await otcRedisIndexService.readTagsForUsers(visibleIds);

  const tagMap = new Map<
    string,
    {
      interestIds: string[];
      activityIds: string[];
      updatedAt: string;
      headline: string | null;
      profileId: string;
    }
  >();
  for (const [userId, tags] of tagsByUserId) {
    tagMap.set(userId, {
      interestIds: tags.interestIds,
      activityIds: tags.activityIds,
      updatedAt: tags.updatedAt,
      headline: tags.headline,
      profileId: tags.profileId,
    });
  }

  const ranked = rankSearchSuggestionCandidates(
    new Set(searcherActivityIds),
    new Set(viewerInterestIds),
    tagMap,
  ).slice(0, SEARCH_SUGGESTIONS_LIMIT);

  const profileRows = await openToConnectDiscoveryRepository.loadUserProfilesByUserIds(
    ranked.map((row) => row.userId),
  );
  const profileByUserId = new Map(profileRows.map((row) => [row.userId, row]));
  const suggestionProfileIds = ranked.map((row) => row.profileId).filter(Boolean);
  const [activitiesByProfileId, lookingForByProfileId, professionByProfileId] =
    await Promise.all([
      openToConnectDiscoveryRepository.loadActivitiesByProfileIds(suggestionProfileIds),
      openToConnectDiscoveryRepository.loadLookingForLabelsByProfileIds(suggestionProfileIds),
      openToConnectDiscoveryRepository.loadProfessionLabelsByProfileIds(suggestionProfileIds),
    ]);

  const interestLabelIds = new Set(viewerInterestIds);
  for (const row of ranked) {
    for (const id of row.interestIds) interestLabelIds.add(id);
  }
  const interestLabelsById = await openToConnectDiscoveryRepository.loadInterestLabelsByIds([
    ...interestLabelIds,
  ]);

  const items: OpenToConnectFeedItemDto[] = [];
  for (const row of ranked) {
    const profile = profileByUserId.get(row.userId);
    if (!profile) continue;
    const sharedInterests = listSharedInterestLabels(
      viewerInterestIds,
      row.interestIds,
      interestLabelsById,
    );
    items.push({
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      name: profile.name,
      image: profile.image,
      headline: row.headline,
      activities: activitiesByProfileId.get(profile.profileId) ?? [],
      lookingFor: lookingForByProfileId.get(profile.profileId) ?? [],
      profession: professionByProfileId.get(profile.profileId) ?? null,
      sharedInterestCount: row.sharedInterestCount,
      sharedInterests,
      isOnline: true,
    });
  }

  return {
    items,
    nextCursor: null,
    limit: SEARCH_SUGGESTIONS_LIMIT,
  };
}
