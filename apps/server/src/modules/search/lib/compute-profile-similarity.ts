export type ProfileSimilaritySignals = {
  interestIds: string[];
  goalIds: string[];
  professionId: string | null;
};

function overlapCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const id of a) {
    if (setB.has(id)) n += 1;
  }
  return n;
}

/** Jaccard index — same approach as matching-service `overlapRatio`. */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const id of setA) {
    if (setB.has(id)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function professionIds(professionId: string | null): string[] {
  return professionId ? [professionId] : [];
}

/**
 * 0–99 vibe score for Explore suggestions.
 * Uses bidirectional interest coverage (how much of each person's niche overlaps),
 * Jaccard goals overlap, and profession match — aligned with matching-service weights
 * (interests / goals / professions only).
 */
export function computeProfileSimilarityScore(
  viewer: ProfileSimilaritySignals,
  peer: ProfileSimilaritySignals,
): { matchScore: number; sharedInterestCount: number; sharedGoalCount: number } {
  const sharedInterestCount = overlapCount(viewer.interestIds, peer.interestIds);
  if (sharedInterestCount === 0) {
    return { matchScore: 0, sharedInterestCount: 0, sharedGoalCount: 0 };
  }

  const sharedGoalCount = overlapCount(viewer.goalIds, peer.goalIds);

  const viewerInterestCoverage = sharedInterestCount / viewer.interestIds.length;
  const peerInterestCoverage = sharedInterestCount / peer.interestIds.length;
  const interestComponent = (viewerInterestCoverage + peerInterestCoverage) / 2;

  const goalComponent =
    viewer.goalIds.length === 0 || peer.goalIds.length === 0
      ? 0.5
      : jaccardSimilarity(viewer.goalIds, peer.goalIds);

  const professionComponent = jaccardSimilarity(
    professionIds(viewer.professionId),
    professionIds(peer.professionId),
  );

  const weights = { interests: 12, goals: 13, professions: 6 } as const;
  const weightSum = weights.interests + weights.goals + weights.professions;

  const weighted =
    interestComponent * weights.interests +
    goalComponent * weights.goals +
    professionComponent * weights.professions;

  const rawPercent = (weighted / weightSum) * 100;
  const matchScore = Math.min(99, Math.max(40, Math.round(rawPercent)));

  return { matchScore, sharedInterestCount, sharedGoalCount };
}
