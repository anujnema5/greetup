import logger from "@/core/logging";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";
import { resolveUsersOnlineFlags } from "@/modules/presence/services/resolve-users-online-flags.service";

import {
  dedupeCandidatesByUserId,
  paginateRankedCandidates,
  rankSuggestedCandidates,
} from "../lib/rank-suggested-candidates";
import { suggestPeopleRepository } from "../repositories/suggest-people.repository";
import type { SuggestPeopleResult, SuggestedPersonHit } from "../types/suggested-people.types";

export type { SuggestedPersonHit, SuggestPeopleResult } from "../types/suggested-people.types";

const CANDIDATE_POOL_LIMIT = 80;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 5;

export async function suggestPeopleService(
  viewerId: string,
  page: number = DEFAULT_PAGE,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<SuggestPeopleResult> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(80, Math.max(1, limit));

  const viewer = await suggestPeopleRepository.loadViewerSignals(viewerId);
  if (!viewer || viewer.interestIds.length === 0) {
    logger.debug("suggest_people_empty", { viewerId, reason: "no_viewer_interests" });
    return {
      items: [],
      hasInterests: false,
      page: safePage,
      limit: safeLimit,
      hasMore: false,
    };
  }

  const [blocked, connectionExcluded] = await Promise.all([
    userBlocksRepository.listAllBlockedPeerIds(viewerId),
    userConnectionsRepository.listPeerIdsWithPendingOrAcceptedConnection(viewerId),
  ]);

  const excluded = [...new Set([...blocked, ...connectionExcluded])];

  const rawCandidates = await suggestPeopleRepository.findCandidatesBySharedInterests(
    viewerId,
    viewer.interestIds,
    excluded,
    CANDIDATE_POOL_LIMIT,
  );

  const candidates = dedupeCandidatesByUserId(rawCandidates);

  if (candidates.length === 0) {
    logger.debug("suggest_people_empty", { viewerId, reason: "no_candidates" });
    return {
      items: [],
      hasInterests: true,
      page: safePage,
      limit: safeLimit,
      hasMore: false,
    };
  }

  const profileIds = candidates.map((c) => c.profileId);
  const peerSignalsByProfileId =
    await suggestPeopleRepository.loadSignalsByProfileIds(profileIds);

  const ranked = rankSuggestedCandidates(viewer, candidates, peerSignalsByProfileId);
  const { pageRows, hasMore } = paginateRankedCandidates(ranked, safePage, safeLimit);

  const onlineByUserId = await resolveUsersOnlineFlags(pageRows.map((s) => s.userId));

  const items: SuggestedPersonHit[] = pageRows.map((row) => ({
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    name: row.name,
    image: row.image,
    tagline: row.tagline,
    matchScore: row.matchScore,
    sharedInterestCount: row.sharedInterestCount,
    isOnline: onlineByUserId.get(row.userId) ?? false,
  }));

  logger.debug("suggest_people_resolved", {
    viewerId,
    candidateCount: candidates.length,
    resultCount: items.length,
    page: safePage,
    hasMore,
  });

  return {
    items,
    hasInterests: true,
    page: safePage,
    limit: safeLimit,
    hasMore,
  };
}
