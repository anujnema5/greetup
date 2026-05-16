/** Host kick API body (POST /room/:roomId/kick/:userId). */
export type KickCircleParticipantRequest = {
  roomId: string;
  userId: string;
  restrict?: boolean;
};

export type CircleParticipantRemoveOptions = {
  /** When true, the user is blocked from rejoining this circle. */
  restrict?: boolean;
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
