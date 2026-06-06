import type { RoomStoreState } from "@/features/room/state/room.store";
import type { RoomMediaStatus, RoomSessionPhase } from "@/features/room/types/room-state.types";

/** Room store fields read by global circle Socket.IO bridge components under `listeners/`. */
export type CircleRoomListenerSnapshot = {
  activeRoomId: string | null;
  sessionActive: boolean;
  isMinimized: boolean;
  phase: RoomSessionPhase;
  mediaStatus: RoomMediaStatus;
};

export function selectCircleRoomListenerSnapshot(
  state: RoomStoreState,
): CircleRoomListenerSnapshot {
  return {
    activeRoomId: state.session.activeRoomId,
    sessionActive: state.ui.sessionActive,
    isMinimized: state.ui.isMinimized,
    phase: state.session.phase,
    mediaStatus: state.media.status,
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
