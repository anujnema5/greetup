/** Emitted to the removed peer before session teardown and socket disconnect. */
export const KICKED_SOCKET_EVENT = "kicked" as const;

export type KickedSocketPayload = {
  roomId: string;
};
