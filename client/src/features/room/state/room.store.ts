import { create } from 'zustand';

import { isCircleSearchRoomId } from '@/features/room/lib/navigation/circle-routes';
import { useRoomActivityStore } from '@/features/room/state/room-activity.store';
import type { RoomMediaStatus, RoomPeerEntry, RoomSessionPhase } from '@/features/room/types/room-state.types';

export type RoomStoreState = {
  ui: {
    sessionActive: boolean;
    isMinimized: boolean;
  };
  session: {
    activeRoomId: string | null;
    phase: RoomSessionPhase;
    rtcPrimaryRemoteUserId: string | null;
    conversationId: string | null;
    directCallPeerLabel: string | null;
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
};

type RoomStore = RoomStoreState & {
  enterRoomPage: (payload: { roomId: string }) => void;
  resetRoomState: () => void;
  resetVideoUi: () => void;
  startVideoSession: (
    payload?: {
      roomId?: string | null;
      primaryRemoteUserId?: string | null;
      conversationId?: string | null;
    },
  ) => void;
  endVideoSession: () => void;
  minimizeVideoSession: () => void;
  expandVideoSession: () => void;
  setRoomPhase: (phase: RoomSessionPhase) => void;
  beginSearchingNextCall: () => void;
  setMediaStatus: (status: RoomMediaStatus) => void;
  setRtcPrimaryRemoteUserId: (userId: string | null) => void;
  upsertRoomPeer: (peer: RoomPeerEntry) => void;
  removeRoomPeer: (userId: string) => void;
  setChatDraft: (draft: string) => void;
  setDirectCallPeerLabel: (label: string | null) => void;
};

const createInitialState = (): RoomStoreState => ({
  ui: { sessionActive: false, isMinimized: false },
  session: {
    activeRoomId: null,
    phase: 'idle',
    rtcPrimaryRemoteUserId: null,
    conversationId: null,
    directCallPeerLabel: null,
  },
  media: { status: 'idle' },
  peers: { byUserId: {} },
  chat: { draft: '' },
});

export const useRoomStore = create<RoomStore>((set) => ({
  ...createInitialState(),

  enterRoomPage: (payload) => {
    useRoomActivityStore.getState().onEnterRoomPage(payload.roomId);
    set((state) => {
      const nextId = payload.roomId;
      const rematchRouteChange =
        state.ui.sessionActive &&
        (state.session.phase === 'searching' || state.session.phase === 'in_call');

      if (state.session.activeRoomId !== nextId) {
        if (rematchRouteChange && isCircleSearchRoomId(nextId)) {
          return {
            ...state,
            session: {
              ...state.session,
              phase: 'searching',
              activeRoomId: null,
              rtcPrimaryRemoteUserId: null,
              directCallPeerLabel: null,
            },
            peers: { byUserId: {} },
          };
        }
        if (rematchRouteChange && !isCircleSearchRoomId(nextId)) {
          return {
            ...state,
            session: {
              ...state.session,
              activeRoomId: nextId,
              phase: 'searching',
              rtcPrimaryRemoteUserId: null,
              directCallPeerLabel: null,
            },
            peers: { byUserId: {} },
          };
        }
        return {
          ...state,
          ui: { sessionActive: false, isMinimized: false },
          session: {
            ...state.session,
            activeRoomId: nextId,
            phase: 'lobby',
            rtcPrimaryRemoteUserId: null,
            directCallPeerLabel: null,
          },
        };
      }

      return {
        ...state,
        session: {
          ...state.session,
          activeRoomId: nextId,
          phase: state.ui.sessionActive ? 'in_call' : 'lobby',
        },
        ui: state.ui.sessionActive ? { ...state.ui, isMinimized: false } : state.ui,
      };
    });
  },

  resetRoomState: () => {
    useRoomActivityStore.getState().reset();
    set(createInitialState());
  },

  resetVideoUi: () =>
    set((state) => ({
      ...state,
      ui: { sessionActive: false, isMinimized: false },
    })),

  startVideoSession: (payload) =>
    set((state) => {
      const rid = payload?.roomId;
      const primary = payload?.primaryRemoteUserId;
      const convId = payload?.conversationId;
      return {
        ...state,
        ui: { sessionActive: true, isMinimized: false },
        session: {
          ...state.session,
          activeRoomId: rid !== undefined ? (rid ?? null) : state.session.activeRoomId,
          rtcPrimaryRemoteUserId:
            primary !== undefined ? primary : state.session.rtcPrimaryRemoteUserId,
          conversationId: convId !== undefined ? (convId ?? null) : state.session.conversationId,
          phase: 'in_call',
        },
      };
    }),

  endVideoSession: () => {
    useRoomActivityStore.getState().clearOnSessionChange();
    set((state) => ({
      ...state,
      ui: { sessionActive: false, isMinimized: false },
      session: {
        ...state.session,
        activeRoomId: null,
        phase: 'idle',
        rtcPrimaryRemoteUserId: null,
        conversationId: null,
        directCallPeerLabel: null,
      },
      media: { status: 'idle' },
      peers: { byUserId: {} },
      chat: { draft: '' },
    }));
  },

  minimizeVideoSession: () =>
    set((state) => ({
      ...state,
      ui: { ...state.ui, isMinimized: true },
    })),

  expandVideoSession: () =>
    set((state) => ({
      ...state,
      ui: { ...state.ui, isMinimized: false },
    })),

  setRoomPhase: (phase) =>
    set((state) => ({
      ...state,
      session: { ...state.session, phase },
    })),

  beginSearchingNextCall: () => {
    useRoomActivityStore.getState().clearOnSessionChange();
    set((state) => ({
      ...state,
      ui: { sessionActive: true, isMinimized: false },
      session: {
        ...state.session,
        activeRoomId: null,
        phase: 'searching',
        rtcPrimaryRemoteUserId: null,
        conversationId: null,
        directCallPeerLabel: null,
      },
      media: { status: 'idle' },
      peers: { byUserId: {} },
      chat: { draft: '' },
    }));
  },

  setMediaStatus: (status) =>
    set((state) => ({
      ...state,
      media: { status },
    })),

  setRtcPrimaryRemoteUserId: (userId) =>
    set((state) => ({
      ...state,
      session: { ...state.session, rtcPrimaryRemoteUserId: userId },
    })),

  upsertRoomPeer: (peer) =>
    set((state) => ({
      ...state,
      peers: {
        byUserId: { ...state.peers.byUserId, [peer.userId]: peer },
      },
    })),

  removeRoomPeer: (userId) =>
    set((state) => {
      const { [userId]: _removed, ...rest } = state.peers.byUserId;
      return { ...state, peers: { byUserId: rest } };
    }),

  setChatDraft: (draft) =>
    set((state) => ({
      ...state,
      chat: { draft },
    })),

  setDirectCallPeerLabel: (label) =>
    set((state) => ({
      ...state,
      session: { ...state.session, directCallPeerLabel: label },
    })),
}));

export const selectRoom = (state: RoomStore) => state;

export const selectRoomUi = (state: RoomStore) => state.ui;

export const selectRoomSession = (state: RoomStore) => state.session;

export const selectIsVideoSessionActive = (state: RoomStore) => state.ui.sessionActive;

export const selectIsRoomMinimized = (state: RoomStore) => state.ui.isMinimized;

export const selectActiveRoomId = (state: RoomStore) => state.session.activeRoomId;

export const selectRtcPrimaryRemoteUserId = (state: RoomStore) =>
  state.session.rtcPrimaryRemoteUserId;

export const selectRoomPhase = (state: RoomStore) => state.session.phase;

export const selectRoomPeers = (state: RoomStore) => state.peers.byUserId;

export const selectRoomMediaStatus = (state: RoomStore) => state.media.status;

export const selectRoomChatDraft = (state: RoomStore) => state.chat.draft;

export const selectDirectCallPeerLabel = (state: RoomStore) =>
  state.session.directCallPeerLabel;

/** @deprecated Use `RoomStoreState` — kept for barrel compatibility. */
export type RoomSliceState = RoomStoreState;
