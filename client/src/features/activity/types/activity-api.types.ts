/**
 * Activity API — RTK Query argument/result types for in-room activities.
 */

/** Common JSON envelope for activity POST responses. */
export type ActivityApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type RoomChessInviteMutationArg = { roomId: string };
export type RoomChessInviteMutationResult = { requestId: string; inviteeUserId: string };

export type RoomChessRespondMutationArg = {
  roomId: string;
  requestId: string;
  accept: boolean;
};
export type RoomChessRespondMutationResult = { roomId: string; started: boolean; gameId: string | null };

export type RoomChessEndMutationArg = {
  roomId: string;
  gameId: string;
};
export type RoomChessEndMutationResult = { roomId: string; ended: boolean };
