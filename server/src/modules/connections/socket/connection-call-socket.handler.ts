import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { CONNECTION_CALL_SOCKET_EVENTS } from "@/modules/connections/constants/events/connection-call-socket.events";
import type { ConnectionCallMode } from "@/modules/connections/services/connection-call.service";

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
  reason: "declined" | "missed" | "cancelled";
};

function logEmit(event: string, userId: string, payload: { requestId: string; roomId: string; reason?: string }) {
  logger.debug("connection_call_socket_emit", {
    event,
    userId,
    requestId: payload.requestId,
    roomId: payload.roomId,
    ...(payload.reason ? { reason: payload.reason } : {}),
  });
}

export function emitConnectionCallRing(calleeUserId: string, payload: ConnectionCallRingPayload): void {
  logEmit(CONNECTION_CALL_SOCKET_EVENTS.ring, calleeUserId, payload);
  emitToUser(calleeUserId, CONNECTION_CALL_SOCKET_EVENTS.ring, payload);
}

export function emitConnectionCallAccepted(callerUserId: string, payload: ConnectionCallAcceptedPayload): void {
  logEmit(CONNECTION_CALL_SOCKET_EVENTS.accepted, callerUserId, payload);
  emitToUser(callerUserId, CONNECTION_CALL_SOCKET_EVENTS.accepted, payload);
}

export function emitConnectionCallDeclined(
  callerUserId: string,
  payload: ConnectionCallDeclinedPayload,
): void {
  logEmit(CONNECTION_CALL_SOCKET_EVENTS.declined, callerUserId, payload);
  emitToUser(callerUserId, CONNECTION_CALL_SOCKET_EVENTS.declined, payload);
}

export function emitConnectionCallCancelled(calleeUserId: string, payload: ConnectionCallDeclinedPayload): void {
  logEmit(CONNECTION_CALL_SOCKET_EVENTS.cancelled, calleeUserId, payload);
  emitToUser(calleeUserId, CONNECTION_CALL_SOCKET_EVENTS.cancelled, payload);
}

export function emitConnectionCallMissed(
  userId: string,
  payload: ConnectionCallDeclinedPayload,
): void {
  logEmit(CONNECTION_CALL_SOCKET_EVENTS.missed, userId, payload);
  emitToUser(userId, CONNECTION_CALL_SOCKET_EVENTS.missed, payload);
}
