import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  RoomGamesState,
  RoomMediaStatus,
  RoomPeerEntry,
  RoomSessionPhase,
} from "@/lib/redux/types/room-slice.types";

/**
 * Global room state: video UI (minimize / surf app), session id, and extension points
 * for peers, media (mediasoup), chat, and in-call games.
 */
export interface RoomSliceState {
  ui: {
    /** True while a video/voice session is active (fullscreen or minimized dock). */
    sessionActive: boolean;
    isMinimized: boolean;
  };
  session: {
    activeRoomId: string | null;
    phase: RoomSessionPhase;
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
  session: { activeRoomId: null, phase: "idle" },
  media: { status: "idle" },
  peers: { byUserId: {} },
  chat: { draft: "" },
  games: { active: null },
});

export const roomSlice = createSlice({
  name: "room",
  initialState: initialState(),
  reducers: {
    /**
     * User landed on `/room/[roomId]`. Sets `activeRoomId`.
     * If the id changes, resets to lobby. If same id and a video session is already active (e.g. expand from dock), keeps session and clears minimized.
     */
    enterRoomPage: (state, action: PayloadAction<{ roomId: string }>) => {
      const nextId = action.payload.roomId;
      if (state.session.activeRoomId !== nextId) {
        state.ui.sessionActive = false;
        state.ui.isMinimized = false;
        state.session.activeRoomId = nextId;
        state.session.phase = "lobby";
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

    /** Full reset — leaving match, ending call, or tearing down session. */
    resetRoomState: () => initialState(),

    /** Clears only video dock UI (e.g. before joining a new room route). */
    resetVideoUi: (state) => {
      state.ui.sessionActive = false;
      state.ui.isMinimized = false;
    },

    /** Start fullscreen video session (was `startCall`). */
    startVideoSession: (
      state,
      action: PayloadAction<{ roomId?: string | null } | undefined>,
    ) => {
      state.ui.sessionActive = true;
      state.ui.isMinimized = false;
      const rid = action.payload?.roomId;
      if (rid !== undefined) {
        state.session.activeRoomId = rid ?? null;
      }
      state.session.phase = "in_call";
    },

    /** End video session and clear room-bound client state. */
    endVideoSession: (state) => {
      state.ui.sessionActive = false;
      state.ui.isMinimized = false;
      state.session.activeRoomId = null;
      state.session.phase = "idle";
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

    upsertRoomPeer: (state, action: PayloadAction<RoomPeerEntry>) => {
      state.peers.byUserId[action.payload.userId] = action.payload;
    },

    removeRoomPeer: (state, action: PayloadAction<string>) => {
      delete state.peers.byUserId[action.payload];
    },

    setChatDraft: (state, action: PayloadAction<string>) => {
      state.chat.draft = action.payload;
    },

    /** Future: chess / truth-or-dare */
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
  upsertRoomPeer,
  removeRoomPeer,
  setChatDraft,
  setActiveGame,
} = roomSlice.actions;

export default roomSlice.reducer;
