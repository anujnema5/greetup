import type { JoinRoomResponse } from '@/features/room/types/api/room-api.types';

export type JoinRoomOnceRunner = () => Promise<JoinRoomResponse>;

export type JoinRoomOnceFn = (
  roomId: string,
  run: JoinRoomOnceRunner,
) => Promise<JoinRoomResponse>;
