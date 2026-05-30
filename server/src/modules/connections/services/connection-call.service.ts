import { randomUUID } from "crypto";

import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { users } from "@/core/database/schema";
import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { CONNECTION_CALL_INVITE_TTL_SEC, CONNECTION_CALL_KEYS, USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { conversationService } from "@/modules/chat/services/conversation.service";
import { getAcceptedPeerIdsForUser } from "@/modules/connections/services/accepted-peer-ids.service";
import { peersCallStatusForUser } from "@/modules/connections/services/peers-call-status.service";
import {
  emitConnectionCallAccepted,
  emitConnectionCallCancelled,
  emitConnectionCallDeclined,
  emitConnectionCallMissed,
  emitConnectionCallRing,
} from "@/modules/connections/socket/connection-call-socket.handler";
import { roomCategoriesRepository } from "@/modules/rooms/repositories/room-categories.repository";
import { roomCreationRepository } from "@/modules/rooms/repositories/room-creation.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import {
  clearActiveConnectionCall,
  recordConnectionCallHistory,
  setActiveConnectionCall,
} from "@/modules/connections/services/connection-call-history.service";
import type { ConnectionCallHistoryStatus } from "@/modules/connections/lib/connection-call-system-payload";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";
import { provisionSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";

export type ConnectionCallMode = "audio" | "video";
export type ConnectionCallCancelReason = "cancelled" | "no_answer";

export type ConnectionCallInitiateResult = {
  requestId: string;
  roomId: string;
  conversationId: string;
  calleeUserId: string;
  mode: ConnectionCallMode;
};

export type ConnectionCallRespondResult = {
  requestId: string;
  roomId: string;
  conversationId: string;
  mode: ConnectionCallMode;
  accepted: boolean;
};

export type ConnectionCallErrorCode =
  | "NOT_DIRECT_DM"
  | "NOT_CONNECTION"
  | "CALLEE_OFFLINE"
  | "CALLEE_BUSY"
  | "CALLER_BUSY"
  | "INVITE_PENDING"
  | "INVITE_NOT_FOUND"
  | "NOT_YOUR_INVITE"
  | "INVITE_NOT_PENDING"
  | "ROOM_NOT_FOUND";

export class ConnectionCallError extends Error {
  constructor(
    message: string,
    public readonly code: ConnectionCallErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ConnectionCallError";
  }
}

type InviteRecord = {
  requestId: string;
  roomId: string;
  conversationId: string;
  callerUserId: string;
  calleeUserId: string;
  mode: ConnectionCallMode;
  status: "pending" | "accepted" | "declined" | "cancelled" | "missed";
  createdAt: string;
};

function rejectConnectionCall(
  message: string,
  code: ConnectionCallErrorCode,
  statusCode: number,
  meta?: Record<string, unknown>,
): never {
  logger.warn("connection_call_rejected", { code, statusCode, message, ...meta });
  throw new ConnectionCallError(message, code, statusCode);
}

async function loadCallerPresentation(userId: string): Promise<{ displayName: string; image: string | null }> {
  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { displayName: true, name: true, image: true },
  });
  const displayName = row?.displayName?.trim() || row?.name?.trim() || "Someone";
  return { displayName, image: row?.image ?? null };
}

function resolveDmPeerUserId(
  conv: NonNullable<Awaited<ReturnType<typeof conversationService.getById>>>,
  callerUserId: string,
): string | null {
  if (conv.type === "room_circle") return null;
  const others = conv.participants.filter((p) => p.userId !== callerUserId);
  if (others.length !== 1) return null;
  return others[0]!.userId;
}

async function readInvite(redis: ReturnType<typeof getRedis>, requestId: string): Promise<InviteRecord | null> {
  const raw = await redis.hgetall(CONNECTION_CALL_KEYS.invite(requestId));
  if (!raw?.requestId || !raw.roomId) return null;
  const mode = raw.mode === "video" ? "video" : "audio";
  const status = raw.status as InviteRecord["status"];
  return {
    requestId: raw.requestId,
    roomId: raw.roomId,
    conversationId: raw.conversationId ?? "",
    callerUserId: raw.callerUserId ?? "",
    calleeUserId: raw.calleeUserId ?? "",
    mode,
    status,
    createdAt: raw.createdAt ?? String(Date.now()),
  };
}

async function cleanupInvite(redis: ReturnType<typeof getRedis>, invite: InviteRecord): Promise<void> {
  await redis.del(CONNECTION_CALL_KEYS.invite(invite.requestId));
  await redis.del(CONNECTION_CALL_KEYS.pendingForCallee(invite.calleeUserId));
  await redis.del(CONNECTION_CALL_KEYS.pendingByRoom(invite.roomId));
}

async function finalizeDeclinedRoom(roomId: string): Promise<void> {
  await clearActiveConnectionCall(roomId);
  await endLiveRoomSession(roomId, "match_finalized", {
    preserveScheduledSlot: false,
    notifyParticipants: false,
  });
}

async function recordPendingCallOutcome(
  invite: InviteRecord,
  status: ConnectionCallHistoryStatus,
): Promise<void> {
  if (!invite.conversationId) return;
  try {
    await recordConnectionCallHistory({
      conversationId: invite.conversationId,
      callerUserId: invite.callerUserId,
      mode: invite.mode,
      status,
    });
  } catch (error) {
    logger.error("connection_call_history_record_failed", {
      error,
      requestId: invite.requestId,
      roomId: invite.roomId,
      conversationId: invite.conversationId,
      status,
    });
  }
}

export async function initiateConnectionCallService(
  callerUserId: string,
  conversationId: string,
  mode: ConnectionCallMode,
): Promise<ConnectionCallInitiateResult> {
  const conv = await conversationService.getById(conversationId, callerUserId);
  if (!conv) {
    rejectConnectionCall("Conversation not found", "NOT_DIRECT_DM", 404, {
      callerUserId,
      conversationId,
    });
  }

  const calleeUserId = resolveDmPeerUserId(conv, callerUserId);
  if (!calleeUserId) {
    rejectConnectionCall("Calls are only available in direct messages", "NOT_DIRECT_DM", 400, {
      callerUserId,
      conversationId,
    });
  }

  const peers = await getAcceptedPeerIdsForUser(callerUserId);
  if (!peers.has(calleeUserId)) {
    rejectConnectionCall("You can only call accepted connections", "NOT_CONNECTION", 403, {
      callerUserId,
      calleeUserId,
      conversationId,
    });
  }

  const redis = getRedis();
  const online = (await redis.sismember(USER_PRESENCE_KEYS.ONLINE_USERS_SET, calleeUserId)) === 1;
  if (!online) {
    rejectConnectionCall("They are offline right now", "CALLEE_OFFLINE", 400, {
      callerUserId,
      calleeUserId,
      conversationId,
    });
  }

  const statusMap = await peersCallStatusForUser(callerUserId, [callerUserId, calleeUserId]);
  const callerStatus = statusMap[callerUserId];
  const calleeStatus = statusMap[calleeUserId];

  if (callerStatus?.inLiveRoom) {
    rejectConnectionCall("You are already in a call", "CALLER_BUSY", 409, {
      callerUserId,
      liveRoomId: callerStatus.liveRoomId,
    });
  }
  if (calleeStatus?.inLiveRoom) {
    rejectConnectionCall("They are already in a call", "CALLEE_BUSY", 409, {
      callerUserId,
      calleeUserId,
      liveRoomId: calleeStatus.liveRoomId,
    });
  }

  const existingPendingId = await redis.get(CONNECTION_CALL_KEYS.pendingForCallee(calleeUserId));
  if (existingPendingId) {
    const existing = await readInvite(redis, existingPendingId);
    if (existing?.status === "pending" && existing.callerUserId === callerUserId) {
      const caller = await loadCallerPresentation(callerUserId);
      logger.info("connection_call_re_ring", {
        requestId: existing.requestId,
        roomId: existing.roomId,
        callerUserId,
        calleeUserId,
        conversationId: existing.conversationId,
        mode: existing.mode,
      });
      emitConnectionCallRing(calleeUserId, {
        requestId: existing.requestId,
        roomId: existing.roomId,
        conversationId: existing.conversationId,
        callerUserId,
        callerDisplayName: caller.displayName,
        callerImage: caller.image,
        mode: existing.mode,
        createdAt: Number(existing.createdAt) || Date.now(),
      });
      return {
        requestId: existing.requestId,
        roomId: existing.roomId,
        conversationId: existing.conversationId,
        calleeUserId,
        mode: existing.mode,
      };
    }
    rejectConnectionCall("They already have an incoming call", "INVITE_PENDING", 409, {
      callerUserId,
      calleeUserId,
    });
  }

  const category = await roomCategoriesRepository.findActiveCategoryBySlug("match");
  if (!category) {
    rejectConnectionCall("Call category not configured", "ROOM_NOT_FOUND", 503, { callerUserId });
  }

  const requestId = randomUUID();
  const roomId = randomUUID();
  const createdAt = Date.now();
  const caller = await loadCallerPresentation(callerUserId);

  await roomCreationRepository.createConnectionCallRoom({
    roomId,
    hostUserId: callerUserId,
    categoryId: category.id,
    title: "Call",
  });

  await provisionSessionRoomRedis({
    roomId,
    hostUserId: callerUserId,
    roomType: "direct",
    title: "Call",
    lobbyGateActive: false,
  });

  const inviteKey = CONNECTION_CALL_KEYS.invite(requestId);
  const pendingClaimed = await redis.set(
    CONNECTION_CALL_KEYS.pendingForCallee(calleeUserId),
    requestId,
    "EX",
    CONNECTION_CALL_INVITE_TTL_SEC,
    "NX",
  );
  if (pendingClaimed !== "OK") {
    await finalizeDeclinedRoom(roomId);
    rejectConnectionCall("They already have an incoming call", "INVITE_PENDING", 409, {
      callerUserId,
      calleeUserId,
      roomId,
    });
  }

  await redis.set(CONNECTION_CALL_KEYS.pendingByRoom(roomId), requestId, "EX", CONNECTION_CALL_INVITE_TTL_SEC);
  await redis.hset(inviteKey, {
    requestId,
    roomId,
    conversationId,
    callerUserId,
    calleeUserId,
    mode,
    status: "pending",
    createdAt: String(createdAt),
  });
  await redis.expire(inviteKey, CONNECTION_CALL_INVITE_TTL_SEC);

  emitConnectionCallRing(calleeUserId, {
    requestId,
    roomId,
    conversationId,
    callerUserId,
    callerDisplayName: caller.displayName,
    callerImage: caller.image,
    mode,
    createdAt,
  });

  logger.info("connection_call_initiated", {
    requestId,
    roomId,
    conversationId,
    callerUserId,
    calleeUserId,
    mode,
  });

  return { requestId, roomId, conversationId, calleeUserId, mode };
}

export async function respondConnectionCallService(
  calleeUserId: string,
  requestId: string,
  accept: boolean,
): Promise<ConnectionCallRespondResult> {
  const redis = getRedis();
  const invite = await readInvite(redis, requestId);
  if (!invite) {
    rejectConnectionCall("Call invite not found or expired", "INVITE_NOT_FOUND", 404, {
      calleeUserId,
      requestId,
    });
  }
  if (invite.calleeUserId !== calleeUserId) {
    rejectConnectionCall("This invite is not for you", "NOT_YOUR_INVITE", 403, {
      calleeUserId,
      requestId,
      expectedCalleeUserId: invite.calleeUserId,
    });
  }
  if (invite.status !== "pending") {
    rejectConnectionCall("This invite is no longer pending", "INVITE_NOT_PENDING", 409, {
      calleeUserId,
      requestId,
      status: invite.status,
    });
  }

  if (!accept) {
    await redis.hset(CONNECTION_CALL_KEYS.invite(requestId), { status: "declined" });
    await recordPendingCallOutcome(invite, "declined");
    await cleanupInvite(redis, invite);
    await finalizeDeclinedRoom(invite.roomId);
    emitConnectionCallDeclined(invite.callerUserId, {
      requestId,
      roomId: invite.roomId,
      calleeUserId,
      reason: "declined",
    });
    logger.info("connection_call_declined", {
      requestId,
      roomId: invite.roomId,
      conversationId: invite.conversationId,
      callerUserId: invite.callerUserId,
      calleeUserId,
      mode: invite.mode,
    });
    return {
      requestId,
      roomId: invite.roomId,
      conversationId: invite.conversationId,
      mode: invite.mode,
      accepted: false,
    };
  }

  await roomParticipantsRepository.addOrReactivateParticipantRow(invite.roomId, calleeUserId);
  await redis.hset(CONNECTION_CALL_KEYS.invite(requestId), { status: "accepted" });
  await cleanupInvite(redis, invite);

  await setActiveConnectionCall(invite.roomId, {
    conversationId: invite.conversationId,
    callerUserId: invite.callerUserId,
    calleeUserId: invite.calleeUserId,
    mode: invite.mode,
    acceptedAt: Date.now(),
    requestId,
  });

  emitConnectionCallAccepted(invite.callerUserId, {
    requestId,
    roomId: invite.roomId,
    conversationId: invite.conversationId,
    calleeUserId,
    mode: invite.mode,
  });

  logger.info("connection_call_accepted", {
    requestId,
    roomId: invite.roomId,
    conversationId: invite.conversationId,
    callerUserId: invite.callerUserId,
    calleeUserId,
    mode: invite.mode,
  });

  return {
    requestId,
    roomId: invite.roomId,
    conversationId: invite.conversationId,
    mode: invite.mode,
    accepted: true,
  };
}

export async function cancelConnectionCallService(
  callerUserId: string,
  requestId: string,
  reason: ConnectionCallCancelReason = "cancelled",
): Promise<void> {
  const redis = getRedis();
  const invite = await readInvite(redis, requestId);
  if (!invite) {
    rejectConnectionCall("Call invite not found or expired", "INVITE_NOT_FOUND", 404, {
      callerUserId,
      requestId,
    });
  }
  if (invite.callerUserId !== callerUserId) {
    rejectConnectionCall("This invite is not yours", "NOT_YOUR_INVITE", 403, {
      callerUserId,
      requestId,
      inviteCallerUserId: invite.callerUserId,
    });
  }
  if (invite.status !== "pending") {
    rejectConnectionCall("This invite is no longer pending", "INVITE_NOT_PENDING", 409, {
      callerUserId,
      requestId,
      status: invite.status,
    });
  }

  const missed = reason === "no_answer";
  await redis.hset(CONNECTION_CALL_KEYS.invite(requestId), { status: missed ? "missed" : "cancelled" });
  await recordPendingCallOutcome(invite, missed ? "missed" : "cancelled");
  await cleanupInvite(redis, invite);
  await finalizeDeclinedRoom(invite.roomId);

  logger.info(missed ? "connection_call_no_answer" : "connection_call_cancelled", {
    requestId,
    roomId: invite.roomId,
    conversationId: invite.conversationId,
    callerUserId,
    calleeUserId: invite.calleeUserId,
    mode: invite.mode,
    reason,
  });

  if (missed) {
    emitConnectionCallMissed(invite.callerUserId, {
      requestId,
      roomId: invite.roomId,
      calleeUserId: invite.calleeUserId,
      reason: "missed",
    });
    emitConnectionCallMissed(invite.calleeUserId, {
      requestId,
      roomId: invite.roomId,
      calleeUserId: invite.calleeUserId,
      reason: "missed",
    });
    return;
  }

  emitConnectionCallCancelled(invite.calleeUserId, {
    requestId,
    roomId: invite.roomId,
    calleeUserId: invite.calleeUserId,
    reason: "cancelled",
  });
}

/** Either party may mark a ringing invite as missed (timeout / no answer). */
export async function markConnectionCallMissedService(
  userId: string,
  requestId: string,
): Promise<void> {
  const redis = getRedis();
  const invite = await readInvite(redis, requestId);
  if (!invite) {
    rejectConnectionCall("Call invite not found or expired", "INVITE_NOT_FOUND", 404, {
      userId,
      requestId,
    });
  }
  if (userId !== invite.callerUserId && userId !== invite.calleeUserId) {
    rejectConnectionCall("This invite is not for you", "NOT_YOUR_INVITE", 403, {
      userId,
      requestId,
    });
  }
  if (invite.status !== "pending") {
    rejectConnectionCall("This invite is no longer pending", "INVITE_NOT_PENDING", 409, {
      userId,
      requestId,
      status: invite.status,
    });
  }

  await redis.hset(CONNECTION_CALL_KEYS.invite(requestId), { status: "missed" });
  await recordPendingCallOutcome(invite, "missed");
  await cleanupInvite(redis, invite);
  await finalizeDeclinedRoom(invite.roomId);

  logger.info("connection_call_marked_missed", {
    requestId,
    roomId: invite.roomId,
    conversationId: invite.conversationId,
    callerUserId: invite.callerUserId,
    calleeUserId: invite.calleeUserId,
    markedByUserId: userId,
    mode: invite.mode,
  });

  emitConnectionCallMissed(invite.callerUserId, {
    requestId,
    roomId: invite.roomId,
    calleeUserId: invite.calleeUserId,
    reason: "missed",
  });
  emitConnectionCallMissed(invite.calleeUserId, {
    requestId,
    roomId: invite.roomId,
    calleeUserId: invite.calleeUserId,
    reason: "missed",
  });
}

/** Called when invite TTL expires — best-effort cleanup if keys still exist. */
export async function expireConnectionCallInvite(requestId: string): Promise<void> {
  const redis = getRedis();
  const invite = await readInvite(redis, requestId);
  if (!invite || invite.status !== "pending") {
    logger.debug("connection_call_expire_skipped", {
      requestId,
      found: Boolean(invite),
      status: invite?.status,
    });
    return;
  }

  await redis.hset(CONNECTION_CALL_KEYS.invite(requestId), { status: "missed" });
  await recordPendingCallOutcome(invite, "missed");
  await cleanupInvite(redis, invite);
  await finalizeDeclinedRoom(invite.roomId);

  logger.info("connection_call_expired", {
    requestId,
    roomId: invite.roomId,
    conversationId: invite.conversationId,
    callerUserId: invite.callerUserId,
    calleeUserId: invite.calleeUserId,
    mode: invite.mode,
  });

  emitConnectionCallMissed(invite.callerUserId, {
    requestId,
    roomId: invite.roomId,
    calleeUserId: invite.calleeUserId,
    reason: "missed",
  });
  emitConnectionCallMissed(invite.calleeUserId, {
    requestId,
    roomId: invite.roomId,
    calleeUserId: invite.calleeUserId,
    reason: "missed",
  });
}
