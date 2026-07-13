/** Shared restrict flag for kick API body and in-call remove callbacks. */
export type SpaceParticipantRestrictOption = {
  /** When true, the user is blocked from rejoining this space. */
  restrict?: boolean;
};

/** Options passed from roster / tile UI into host kick handlers. */
export type SpaceParticipantRemoveOptions = SpaceParticipantRestrictOption;

/** POST /room/:roomId/kick/:userId JSON body. */
export type KickSpaceParticipantApiBody = SpaceParticipantRestrictOption;

/** Variables for `useKickSpaceParticipant`. */
export type KickSpaceParticipantRequest = {
  roomId: string;
  userId: string;
} & KickSpaceParticipantApiBody;

/** Success payload from kick endpoint (`ApiResponse.data`). */
export type KickSpaceParticipantMutationResult = {
  removed: boolean;
  restricted: boolean;
};

export type OnRemoveSpaceParticipant = (
  userId: string,
  displayName: string,
  options?: SpaceParticipantRemoveOptions,
) => void | Promise<void>;

/** Confirm-dialog state for remove vs remove-and-restrict. */
export type ParticipantRemoveTarget = {
  userId: string;
  displayName: string;
  restrict: boolean;
};

/** Props threaded through main-stage layouts for host kick controls on remote tiles. */
export type SpaceParticipantKickProps = {
  isSpaceHost?: boolean;
  onKickParticipant?: OnRemoveSpaceParticipant;
  kickingUserId?: string | null;
};

export function buildKickSpaceParticipantApiBody(
  restrict: boolean | undefined,
): KickSpaceParticipantApiBody | undefined {
  return restrict === true ? { restrict: true } : undefined;
}

export function serializeKickSpaceParticipantBody(
  restrict: boolean | undefined,
): string | undefined {
  const body = buildKickSpaceParticipantApiBody(restrict);
  return body ? JSON.stringify(body) : undefined;
}
