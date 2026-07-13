export function messageForFailedStart(reason: string | undefined): string {
  switch (reason) {
    case 'user_unavailable':
      return 'Still marked as in a room. Open the room page and use End/Leave, or wait a few minutes and try again.';
    case 'snapshot_not_found':
      return 'Could not start matchmaking. Make sure your profile is complete.';
    default:
      return 'Could not start matchmaking. Please try again.';
  }
}

export function messageForNoMatch(reason: string): string {
  switch (reason) {
    case 'pool_empty':
      return 'No one else was searching just then. Try again in a moment.';
    case 'no_compatible_candidate':
      return 'No compatible match right now. Try widening preferences or try again in a moment.';
    default:
      return 'No match found. Try again in a moment.';
  }
}

export function messageForProposalCancelled(reason: string): string {
  switch (reason) {
    case 'you_skipped':
      return 'You skipped this match.';
    case 'peer_skipped':
      return 'They skipped — you can find someone else.';
    case 'proposal_peer_cancelled':
      return 'The other person stopped searching.';
    case 'cancelled_by_user':
      return 'Match cancelled.';
    case 'room_create_failed':
      return 'Could not start the call. Try again.';
    default:
      return 'Match ended.';
  }
}
