import type { ScoredMatchCandidate } from "@/matchmaking/domain/matching.types";

export function sortScoredCandidatesDescending(candidates: ScoredMatchCandidate[]): void {
  candidates.sort((a, b) => {
    if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
    return b.poolScore - a.poolScore;
  });
}
