const BLOCKED_NO_MATCH_OFFER_REASONS = new Set(["user_unavailable", "snapshot_not_found"]);

/** Whether to show the post no-match Open to Connect offer (E28 in design spec). */
export function shouldOfferOpenToConnectAfterNoMatch(
  reason: string | undefined | null,
): boolean {
  if (!reason) return true;
  return !BLOCKED_NO_MATCH_OFFER_REASONS.has(reason);
}
