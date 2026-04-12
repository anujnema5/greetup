import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  RoomGamesState,
  RoomMediaStatus,
  RoomPeerEntry,
  RoomSessionPhase,
} from "@/lib/redux/types/room-slice.types";

export interface RoomSliceState {
  ui: {
    sessionActive: boolean;
    isMinimized: boolean;
  };
  session: {
    activeRoomId: string | null;
    phase: RoomSessionPhase;
    rtcPrimaryRemoteUserId: string | null;
    conversationId: string | null;
  };
  media: {
    status: RoomMediaStatus;
  };
  peers: {
    byUserId: Record<string, RoomPeerEntry>;
  };
  chat: {
    draft: string;
  };
  games: RoomGamesState;
}

const initialState = (): RoomSliceState => ({
  ui: { sessionActive: false, isMinimized: false },
  session: { activeRoomId: null, phase: "idle", rtcPrimaryRemoteUserId: null, conversationId: null },
  media: { status: "idle" },
  peers: { byUserId: {} },
  chat: { draft: "" },
  games: { active: null },
});

export const roomSlice = createSlice({
  name: "room",
  initialState: initialState(),
  reducers: {
    enterRoomPage: (state, action: PayloadAction<{ roomId: string }>) => {
      const nextId = action.payload.roomId;
      if (state.session.activeRoomId !== nextId) {
        state.ui.sessionActive = false;
        state.ui.isMinimized = false;
        state.session.activeRoomId = nextId;
        state.session.phase = "lobby";
        state.session.rtcPrimaryRemoteUserId = null;
        return;
      }
      state.session.activeRoomId = nextId;
      if (state.ui.sessionActive) {
        state.ui.isMinimized = false;
        state.session.phase = "in_call";
      } else {
        state.session.phase = "lobby";
      }
    },

    resetRoomState: () => initialState(),

    resetVideoUi: (state) => {
      state.ui.sessionActive = false;
      state.ui.isMinimized = false;
    },

    startVideoSession: (
      state,
      action: PayloadAction<
        { roomId?: string | null; primaryRemoteUserId?: string | null; conversationId?: string | null } | undefined
      >,
    ) => {
      state.ui.sessionActive = true;
      state.ui.isMinimized = false;
      const rid = action.payload?.roomId;
      if (rid !== undefined) {
        state.session.activeRoomId = rid ?? null;
      }
      const primary = action.payload?.primaryRemoteUserId;
      if (primary !== undefined) {
        state.session.rtcPrimaryRemoteUserId = primary;
      }
      const convId = action.payload?.conversationId;
      if (convId !== undefined) {
        state.session.conversationId = convId ?? null;
      }
      state.session.phase = "in_call";
    },

    endVideoSession: (state) => {
      state.ui.sessionActive = false;
      state.ui.isMinimized = false;
      state.session.activeRoomId = null;
      state.session.phase = "idle";
      state.session.rtcPrimaryRemoteUserId = null;
      state.session.conversationId = null;
      state.media.status = "idle";
      state.peers.byUserId = {};
      state.chat.draft = "";
      state.games.active = null;
    },

    minimizeVideoSession: (state) => {
      state.ui.isMinimized = true;
    },

    expandVideoSession: (state) => {
      state.ui.isMinimized = false;
    },

    setRoomPhase: (state, action: PayloadAction<RoomSessionPhase>) => {
      state.session.phase = action.payload;
    },

    setMediaStatus: (state, action: PayloadAction<RoomMediaStatus>) => {
      state.media.status = action.payload;
    },

    setRtcPrimaryRemoteUserId: (state, action: PayloadAction<string | null>) => {
      state.session.rtcPrimaryRemoteUserId = action.payload;
    },

    upsertRoomPeer: (state, action: PayloadAction<RoomPeerEntry>) => {
      state.peers.byUserId[action.payload.userId] = action.payload;
    },

    removeRoomPeer: (state, action: PayloadAction<string>) => {
      delete state.peers.byUserId[action.payload];
    },

    setChatDraft: (state, action: PayloadAction<string>) => {
      state.chat.draft = action.payload;
    },

    setActiveGame: (state, action: PayloadAction<RoomGamesState["active"]>) => {
      state.games.active = action.payload;
    },
  },
});

export const {
  enterRoomPage,
  resetRoomState,
  resetVideoUi,
  startVideoSession,
  endVideoSession,
  minimizeVideoSession,
  expandVideoSession,
  setRoomPhase,
  setMediaStatus,
  setRtcPrimaryRemoteUserId,
  upsertRoomPeer,
  removeRoomPeer,
  setChatDraft,
  setActiveGame,
} = roomSlice.actions;

export default roomSlice.reducer;
