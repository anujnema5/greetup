import type { RootState } from "@/lib/redux/store";

export const selectRoom = (state: RootState) => state.room;

export const selectRoomUi = (state: RootState) => state.room.ui;

export const selectRoomSession = (state: RootState) => state.room.session;

export const selectIsVideoSessionActive = (state: RootState) =>
  state.room.ui.sessionActive;

export const selectIsRoomMinimized = (state: RootState) => state.room.ui.isMinimized;

export const selectActiveRoomId = (state: RootState) => state.room.session.activeRoomId;

export const selectRtcPrimaryRemoteUserId = (state: RootState) =>
  state.room.session.rtcPrimaryRemoteUserId;

export const selectRoomPhase = (state: RootState) => state.room.session.phase;

export const selectRoomPeers = (state: RootState) => state.room.peers.byUserId;

export const selectRoomMediaStatus = (state: RootState) => state.room.media.status;

export const selectRoomChatDraft = (state: RootState) => state.room.chat.draft;

export const selectRoomGames = (state: RootState) => state.room.games;
