/**
 * Strategy resolver for matchmaking execution.
 * Keeps tier-specific policy (retries/scoring mode) separate from orchestration flow.
 */
import type {
  MatchAlgorithm,
  MatchUserTier,
  ScoredMatchCandidate,
  SnapshotUserProfile,
} from "@/matchmaking/types";

export type CandidateScoringMode = "eligible_only" | "all_compatible";

export type MatchExecutionStrategy = {
  strategyId: MatchAlgorithm;
  tier: MatchUserTier;
  retryBudget: number;
  primaryScoringMode: CandidateScoringMode;
  fallbackScoringMode: CandidateScoringMode;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value > 0;
  return false;
};

const toTier = (snapshot: SnapshotUserProfile): MatchUserTier => {
  if (toBoolean(snapshot.attributes.isPremium) || toBoolean(snapshot.attributes.premiumEnabled)) {
    return "premium";
  }
  return "standard";
};

const buildStandardStrategy = (): MatchExecutionStrategy => ({
  strategyId: "standard_pool",
  tier: "standard",
  retryBudget: 0,
  primaryScoringMode: "eligible_only",
  fallbackScoringMode: "all_compatible",
});

const buildPremiumStrategy = (): MatchExecutionStrategy => ({
  strategyId: "premium_pool",
  tier: "premium",
  // One extra retry pass for premium users by default.
  retryBudget: 1,
  primaryScoringMode: "eligible_only",
  fallbackScoringMode: "all_compatible",
});

export function resolveMatchExecutionStrategy(
  requesterSnapshot: SnapshotUserProfile,
): MatchExecutionStrategy {
  const tier = toTier(requesterSnapshot);
  if (tier === "premium") return buildPremiumStrategy();
  return buildStandardStrategy();
}

/**
 * Final candidate-order customization hook.
 * Currently deterministic for both tiers; kept as a seam for future ranking policies.
 */
export function orderCandidatesForStrategy(
  strategy: MatchExecutionStrategy,
  candidates: ScoredMatchCandidate[],
): ScoredMatchCandidate[] {
  void strategy;
  return candidates;
}
