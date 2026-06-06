/** Shared restrict flag for kick API body and in-call remove callbacks. */
export type CircleParticipantRestrictOption = {
  /** When true, the user is blocked from rejoining this circle. */
  restrict?: boolean;
};

/** Options passed from roster / tile UI into host kick handlers. */
export type CircleParticipantRemoveOptions = CircleParticipantRestrictOption;

/** POST /room/:roomId/kick/:userId JSON body. */
export type KickCircleParticipantApiBody = CircleParticipantRestrictOption;

/** Variables for `useKickCircleParticipant`. */
export type KickCircleParticipantRequest = {
  roomId: string;
  userId: string;
} & KickCircleParticipantApiBody;

/** Success payload from kick endpoint (`ApiResponse.data`). */
export type KickCircleParticipantMutationResult = {
  removed: boolean;
  restricted: boolean;
};

export type OnRemoveCircleParticipant = (
  userId: string,
  displayName: string,
  options?: CircleParticipantRemoveOptions,
) => void | Promise<void>;

/** Confirm-dialog state for remove vs remove-and-restrict. */
export type ParticipantRemoveTarget = {
  userId: string;
  displayName: string;
  restrict: boolean;
};

/** Props threaded through main-stage layouts for host kick controls on remote tiles. */
export type CircleParticipantKickProps = {
  isCircleHost?: boolean;
  onKickParticipant?: OnRemoveCircleParticipant;
  kickingUserId?: string | null;
};

export function buildKickCircleParticipantApiBody(
  restrict: boolean | undefined,
): KickCircleParticipantApiBody | undefined {
  return restrict === true ? { restrict: true } : undefined;
}

export function serializeKickCircleParticipantBody(
  restrict: boolean | undefined,
): string | undefined {
  const body = buildKickCircleParticipantApiBody(restrict);
  return body ? JSON.stringify(body) : undefined;
}
