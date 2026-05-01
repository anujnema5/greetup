/**
 * Room API — RTK Query argument/result types for room routes.
 */

/** Common JSON envelope for room/direct-expand POST responses. */
export type RoomApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type RoomInviteMutationArg = { roomId: string; inviteeUserId: string };
export type RoomInviteMutationResult = { inviteId: string };

export type RoomInviteRespondMutationArg = {
  roomId: string;
  inviteId: string;
  accept: boolean;
};
export type RoomInviteRespondMutationResult = { roomId: string; expanded: boolean };

export type UpdateRoomTitleMutationArg = { roomId: string; title: string };
export type UpdateRoomTitleMutationResult = { title: string };

/** Back-compat aliases (legacy direct-expand naming). */
export type ExpandDirectInviteMutationArg = RoomInviteMutationArg;
export type ExpandDirectInviteMutationResult = RoomInviteMutationResult;
export type ExpandDirectRespondMutationArg = RoomInviteRespondMutationArg;
export type ExpandDirectRespondMutationResult = RoomInviteRespondMutationResult;
