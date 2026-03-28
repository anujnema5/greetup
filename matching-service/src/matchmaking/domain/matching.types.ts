export type MatchState = "free" | "searching" | "locked" | "matched" | "in_room";

export type MatchCandidate = {
  userId: string;
  score: number;
};

export type MatchAttempt = {
  attemptId: string;
  requesterId: string;
  retryCount: number;
};
