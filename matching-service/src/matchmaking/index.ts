/**
 * Matchmaking module barrel exports.
 * Keeps import paths short for app routes, workers, and tests.
 */
export { MatchOrchestratorService } from "@/matchmaking/orchestrator";
export { MatchValidatorService } from "@/matchmaking/scoring/validator";
export { MatchScoreService } from "@/matchmaking/scoring/scorer";
export type {
  MatchAttempt,
  MatchCandidate,
  MatchState,
  ScoredMatchCandidate,
} from "@/matchmaking/types";
export { MatchLockService } from "@/matchmaking/pool/lock";
export { MatchPoolService } from "@/matchmaking/pool/pool";
export { RoomOrchestrationService } from "@/matchmaking/room";
export { SnapshotRepository } from "@/matchmaking/repositories/snapshot";
export { MatchAttemptRepository } from "@/matchmaking/repositories/attempt";
export {
  resolveMatchExecutionStrategy,
  orderCandidatesForStrategy,
  type MatchExecutionStrategy,
  type CandidateScoringMode,
} from "@/matchmaking/strategy";
