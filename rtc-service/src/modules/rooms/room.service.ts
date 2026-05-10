import {
  getOrCreateLocalRoom,
  getLocalRoom,
  releaseRoom,
  type LocalRoom,
  type LocalRoomResult,
} from "@/modules/rooms/room-registry";
import * as roomRepository from "@/modules/rooms/room.repository";

export type { LocalRoom, LocalRoomResult };

export const roomService = {
  getOrCreateLocalRoom,
  getLocalRoom,
  releaseRoom,
  getRoomRecord: roomRepository.getRoomRecord,
};
