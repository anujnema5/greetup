import {
  getOrCreateLocalRoom,
  getLocalRoom,
  releaseRoom,
  type LocalRoom,
  type LocalRoomResult,
} from "@/rooms/room-registry";
import * as roomRepository from "@/rooms/room.repository";

export type { LocalRoom, LocalRoomResult };

export const roomService = {
  getOrCreateLocalRoom,
  getLocalRoom,
  releaseRoom,
  getRoomRecord: roomRepository.getRoomRecord,
};
