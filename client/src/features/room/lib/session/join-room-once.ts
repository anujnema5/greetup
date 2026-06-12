import type { JoinRoomResponse } from '@/features/room/types/api/room-api.types';

/**
 * Collapses duplicate POST `/room/:id/join` calls for the same roomId
 * (e.g. React Strict Mode re-running the join effect).
 */

const inflightByRoomId = new Map<string, Promise<JoinRoomResponse>>();

export function joinRoomOnce(
  roomId: string,
  run: () => Promise<JoinRoomResponse>,
): Promise<JoinRoomResponse> {
  const existing = inflightByRoomId.get(roomId);
  if (existing) return existing;

  const promise = run().finally(() => {
    if (inflightByRoomId.get(roomId) === promise) {
      inflightByRoomId.delete(roomId);
    }
  });
  inflightByRoomId.set(roomId, promise);
  return promise;
}
