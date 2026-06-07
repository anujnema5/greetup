/**
 * Global room / realtime session model (client-only).
 * Server truth is in React Query; Zustand holds session UI + WebRTC peer bookkeeping.
 */

export type {
  RoomActiveActivity,
  RoomChessActivityState,
  RoomChessLastOutcome,
} from './activity-state.types';

export type RoomSessionPhase = 'idle' | 'lobby' | 'in_call' | 'searching';

export type RoomPeerEntry = {
  userId: string;
};

export type RoomMediaStatus = 'idle' | 'connecting' | 'connected' | 'error';
