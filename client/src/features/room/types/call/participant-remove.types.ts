export type CircleParticipantRemoveOptions = {
  /** When true, the user is blocked from rejoining this circle. */
  restrict?: boolean;
};

export type OnRemoveCircleParticipant = (
  userId: string,
  displayName: string,
  options?: CircleParticipantRemoveOptions,
) => void | Promise<void>;
