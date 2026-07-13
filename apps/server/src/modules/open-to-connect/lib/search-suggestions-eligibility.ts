const BLOCKED_NO_MATCH_SUGGESTION_REASONS = new Set(["user_unavailable", "snapshot_not_found"]);

export function isEligibleNoMatchReasonForSuggestions(reason: string | null | undefined): boolean {
  if (!reason) return true;
  return !BLOCKED_NO_MATCH_SUGGESTION_REASONS.has(reason);
}
