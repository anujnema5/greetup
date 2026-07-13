/**
 * Matchmaking module barrel exports.
 * Keeps import paths short for app routes, workers, and tests.
 */
export { MatchOrchestratorService } from "@/modules/simple-matching/orchestrator";
export { MatchValidatorService } from "@/modules/simple-matching/scoring/validator";
export { MatchScoreService } from "@/modules/simple-matching/scoring/scorer";
export type {
  MatchAttempt,
  MatchCandidate,
  MatchState,
  ScoredMatchCandidate,
} from "@/modules/simple-matching/types";
export { MatchLockService } from "@/modules/simple-matching/pool/lock";
export { MatchPoolService } from "@/modules/simple-matching/pool/pool";
export { RoomOrchestrationService } from "@/modules/simple-matching/room";
export { SnapshotRepository } from "@/modules/simple-matching/repositories/snapshot";
export { MatchAttemptRepository } from "@/modules/simple-matching/repositories/attempt";
export {
  resolveMatchExecutionStrategy,
  orderCandidatesForStrategy,
  type MatchExecutionStrategy,
  type CandidateScoringMode,
} from "@/modules/simple-matching/strategy";
