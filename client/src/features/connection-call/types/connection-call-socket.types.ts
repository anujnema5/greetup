import type { ConnectionCallMode } from './connection-call.types';

export const CONNECTION_CALL_SOCKET_EVENTS = {
  ring: 'connection:call:ring',
  accepted: 'connection:call:accepted',
  declined: 'connection:call:declined',
  cancelled: 'connection:call:cancelled',
  missed: 'connection:call:missed',
} as const;

export type ConnectionCallRingPayload = {
  requestId: string;
  roomId: string;
  conversationId: string;
  callerUserId: string;
  callerDisplayName: string;
  callerImage: string | null;
  mode: ConnectionCallMode;
  createdAt: number;
};

export type ConnectionCallAcceptedPayload = {
  requestId: string;
  roomId: string;
  conversationId: string;
  calleeUserId: string;
  mode: ConnectionCallMode;
};

export type ConnectionCallDeclinedPayload = {
  requestId: string;
  roomId: string;
  calleeUserId: string;
  reason: 'declined' | 'missed' | 'cancelled';
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function readString(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function readMode(o: Record<string, unknown>): ConnectionCallMode {
  return o.mode === 'video' ? 'video' : 'audio';
}

export function parseConnectionCallRingPayload(payload: unknown): ConnectionCallRingPayload | null {
  if (!isRecord(payload)) return null;
  const requestId = readString(payload, 'requestId');
  const roomId = readString(payload, 'roomId');
  const conversationId = readString(payload, 'conversationId');
  const callerUserId = readString(payload, 'callerUserId');
  const callerDisplayName = readString(payload, 'callerDisplayName');
  if (!requestId || !roomId || !conversationId || !callerUserId || !callerDisplayName) return null;
  const image = payload.callerImage;
  return {
    requestId,
    roomId,
    conversationId,
    callerUserId,
    callerDisplayName,
    callerImage: typeof image === 'string' ? image : null,
    mode: readMode(payload),
    createdAt: typeof payload.createdAt === 'number' ? payload.createdAt : Date.now(),
  };
}

export function parseConnectionCallAcceptedPayload(payload: unknown): ConnectionCallAcceptedPayload | null {
  if (!isRecord(payload)) return null;
  const requestId = readString(payload, 'requestId');
  const roomId = readString(payload, 'roomId');
  const conversationId = readString(payload, 'conversationId');
  const calleeUserId = readString(payload, 'calleeUserId');
  if (!requestId || !roomId || !conversationId || !calleeUserId) return null;
  return {
    requestId,
    roomId,
    conversationId,
    calleeUserId,
    mode: readMode(payload),
  };
}

export function parseConnectionCallDeclinedPayload(payload: unknown): ConnectionCallDeclinedPayload | null {
  if (!isRecord(payload)) return null;
  const requestId = readString(payload, 'requestId');
  const roomId = readString(payload, 'roomId');
  const calleeUserId = readString(payload, 'calleeUserId');
  if (!requestId || !roomId || !calleeUserId) return null;
  const reason = payload.reason;
  const normalized =
    reason === 'declined' || reason === 'missed' || reason === 'cancelled' ? reason : 'declined';
  return { requestId, roomId, calleeUserId, reason: normalized };
}
