export type MatchState = "free" | "searching" | "locked" | "matched" | "in_room";

export type MatchCandidate = {
  userId: string;
  score: number;
};

/** Pool candidate after compatibility and scoring (ready to rank and pair). */
export type ScoredMatchCandidate = {
  userId: string;
  matchScore: number;
  poolScore: number;
};

export type MatchAttempt = {
  attemptId: string;
  requesterId: string;
  retryCount: number;
};
