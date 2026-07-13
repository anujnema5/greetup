import { buildSuggestedTagline } from "./build-suggested-tagline";
import {
  computeProfileSimilarityScore,
  type ProfileSimilaritySignals,
} from "./compute-profile-similarity";
import type {
  SuggestPeopleCandidateRow,
  ViewerProfileSignalsRow,
} from "../repositories/suggest-people.repository";

export type RankedSuggestCandidate = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  tagline: string;
  matchScore: number;
  sharedInterestCount: number;
  sharedGoalCount: number;
};

type PeerSignalsRow = {
  interestIds: string[];
  goalIds: string[];
  professionId: string | null;
  professionDisplayName: string | null;
  interestLabelsById: Map<string, string>;
};

export function dedupeCandidatesByUserId(
  candidates: SuggestPeopleCandidateRow[],
): SuggestPeopleCandidateRow[] {
  const seenUserIds = new Set<string>();
  return candidates.filter((c) => {
    if (seenUserIds.has(c.userId)) return false;
    seenUserIds.add(c.userId);
    return true;
  });
}

export function rankSuggestedCandidates(
  viewer: ViewerProfileSignalsRow,
  candidates: SuggestPeopleCandidateRow[],
  peerSignalsByProfileId: Map<string, PeerSignalsRow>,
): RankedSuggestCandidate[] {
  const viewerSignals: ProfileSimilaritySignals = {
    interestIds: viewer.interestIds,
    goalIds: viewer.goalIds,
    professionId: viewer.professionId,
  };

  return candidates
    .map((candidate) => {
      const peerRow = peerSignalsByProfileId.get(candidate.profileId);
      if (!peerRow) return null;

      const peerSignals: ProfileSimilaritySignals = {
        interestIds: peerRow.interestIds,
        goalIds: peerRow.goalIds,
        professionId: peerRow.professionId,
      };

      const { matchScore, sharedInterestCount, sharedGoalCount } =
        computeProfileSimilarityScore(viewerSignals, peerSignals);

      if (matchScore === 0) return null;

      const sharedInterestLabels = viewer.interestIds
        .filter((id) => peerRow.interestIds.includes(id))
        .map((id) => viewer.interestLabelsById.get(id) ?? peerRow.interestLabelsById.get(id))
        .filter((label): label is string => Boolean(label));

      const tagline = buildSuggestedTagline({
        professionDisplayName: peerRow.professionDisplayName,
        sharedInterestLabels,
        bio: candidate.bio,
      });

      return {
        userId: candidate.userId,
        username: candidate.username,
        displayName: candidate.displayName,
        name: candidate.name,
        image: candidate.image,
        tagline,
        matchScore,
        sharedInterestCount,
        sharedGoalCount,
      };
    })
    .filter((row): row is RankedSuggestCandidate => row !== null)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.sharedInterestCount !== a.sharedInterestCount) {
        return b.sharedInterestCount - a.sharedInterestCount;
      }
      if (b.sharedGoalCount !== a.sharedGoalCount) {
        return b.sharedGoalCount - a.sharedGoalCount;
      }
      return a.userId.localeCompare(b.userId);
    });
}

export function paginateRankedCandidates(
  ranked: RankedSuggestCandidate[],
  page: number,
  limit: number,
): { pageRows: RankedSuggestCandidate[]; hasMore: boolean } {
  const offset = (page - 1) * limit;
  const slice = ranked.slice(offset, offset + limit + 1);
  const hasMore = slice.length > limit;
  const pageRows = hasMore ? slice.slice(0, limit) : slice;
  return { pageRows, hasMore };
}
