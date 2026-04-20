/**
 * Room API — RTK Query argument/result types for room routes.
 */

/** Common JSON envelope for room/direct-expand POST responses. */
export type RoomApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type ExpandDirectInviteMutationArg = { roomId: string; inviteeUserId: string };
export type ExpandDirectInviteMutationResult = { inviteId: string };

export type ExpandDirectRespondMutationArg = {
  roomId: string;
  inviteId: string;
  accept: boolean;
};
export type ExpandDirectRespondMutationResult = { roomId: string; expanded: boolean };
