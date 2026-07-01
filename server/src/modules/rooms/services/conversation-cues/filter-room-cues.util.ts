import type { ConversationCueDto } from "@/modules/rooms/services/conversation-cues/conversation-cues.types";

export type CanonicalParticipants = {
  participantA: string;
  participantB: string;
};

export function canonicalParticipants(
  userId: string,
  peerUserId: string,
): CanonicalParticipants {
  return userId < peerUserId
    ? { participantA: userId, participantB: peerUserId }
    : { participantA: peerUserId, participantB: userId };
}

/** Peer-only cues are shown only to the participant who did not select the activity. */
export function cueVisibleToUser(
  cue: ConversationCueDto,
  userId: string,
  { participantA, participantB }: CanonicalParticipants,
): boolean {
  if (cue.kind !== "peer_session_activity") return true;

  const match = cue.id.match(/^peer_session:([ab]):/);
  if (!match) return true;

  const selector = match[1] === "a" ? participantA : participantB;
  return selector !== userId;
}

export function filterCuesForUser(
  cues: ConversationCueDto[],
  userId: string,
  participants: CanonicalParticipants,
  shown: Set<string>,
): ConversationCueDto[] {
  return cues.filter(
    (cue) => !shown.has(cue.id) && cueVisibleToUser(cue, userId, participants),
  );
}
