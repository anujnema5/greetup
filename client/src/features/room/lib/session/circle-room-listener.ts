import type { RootState } from "@/lib/redux/store";
import type { RoomMediaStatus, RoomSessionPhase } from "@/lib/redux/types/room-slice.types";

/** Redux fields read by global circle Socket.IO bridge components under `listeners/`. */
export type CircleRoomListenerSnapshot = {
  activeRoomId: string | null;
  sessionActive: boolean;
  isMinimized: boolean;
  phase: RoomSessionPhase;
  mediaStatus: RoomMediaStatus;
};

export function selectCircleRoomListenerSnapshot(state: RootState): CircleRoomListenerSnapshot {
  return {
    activeRoomId: state.room.session.activeRoomId,
    sessionActive: state.room.ui.sessionActive,
    isMinimized: state.room.ui.isMinimized,
    phase: state.room.session.phase,
    mediaStatus: state.room.media.status,
  };
}

export function userIsInThisCircleSession(
  snap: CircleRoomListenerSnapshot,
  roomId: string,
): boolean {
  if (roomId !== snap.activeRoomId) return false;
  return (
    snap.phase === "lobby" ||
    snap.phase === "in_call" ||
    snap.sessionActive ||
    snap.isMinimized
  );
}

/** True while the user is on the room surface but not yet in a live mediasoup session. */
export function userIsWaitingToJoinRtc(snap: CircleRoomListenerSnapshot): boolean {
  return snap.mediaStatus !== "connected";
}
