import {
  forceClearRoomRedis,
  getOrCreateLocalRoom,
  getLocalRoom,
  releaseRoom,
  type LocalRoom,
  type LocalRoomResult,
} from "@/modules/rtc/room/room-registry";
import * as roomRepository from "@/modules/rtc/room/room.repository";

export type { LocalRoom, LocalRoomResult };

export const roomService = {
  getOrCreateLocalRoom,
  getLocalRoom,
  releaseRoom,
  forceClearRoomRedis,
  getRoomRecord: roomRepository.getRoomRecord,
};
