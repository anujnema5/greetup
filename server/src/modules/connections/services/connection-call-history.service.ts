import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { CONNECTION_CALL_KEYS } from "@/core/redis/keys";
import {
  buildConnectionCallSystemPayload,
  type ConnectionCallHistoryStatus,
} from "@/modules/connections/lib/connection-call-system-payload";
import type { ConnectionCallMode } from "@/modules/connections/services/connection-call.service";
import { messageService } from "@/modules/chat/services/message.service";

const ACTIVE_CALL_TTL_SEC = 4 * 60 * 60;

export type ActiveConnectionCallMeta = {
  conversationId: string;
  callerUserId: string;
  calleeUserId: string;
  mode: ConnectionCallMode;
  acceptedAt: number;
  requestId: string;
};

export async function recordConnectionCallHistory(params: {
  conversationId: string;
  callerUserId: string;
  mode: ConnectionCallMode;
  status: ConnectionCallHistoryStatus;
  durationSec?: number | null;
}): Promise<void> {
  const msg = await messageService.publishSystemMessage({
    conversationId: params.conversationId,
    senderId: params.callerUserId,
    systemPayload: buildConnectionCallSystemPayload({
      mode: params.mode,
      status: params.status,
      initiatorUserId: params.callerUserId,
      durationSec: params.durationSec,
    }),
  });

  logger.info("connection_call_history_recorded", {
    messageId: msg.id,
    conversationId: params.conversationId,
    callerUserId: params.callerUserId,
    mode: params.mode,
    status: params.status,
    durationSec: params.durationSec ?? null,
  });
}

export async function setActiveConnectionCall(roomId: string, meta: ActiveConnectionCallMeta): Promise<void> {
  const redis = getRedis();
  await redis.set(
    CONNECTION_CALL_KEYS.activeByRoom(roomId),
    JSON.stringify(meta),
    "EX",
    ACTIVE_CALL_TTL_SEC,
  );

  logger.debug("connection_call_active_meta_set", {
    roomId,
    requestId: meta.requestId,
    conversationId: meta.conversationId,
    callerUserId: meta.callerUserId,
    calleeUserId: meta.calleeUserId,
    mode: meta.mode,
  });
}

export async function clearActiveConnectionCall(roomId: string): Promise<void> {
  const redis = getRedis();
  const deleted = await redis.del(CONNECTION_CALL_KEYS.activeByRoom(roomId));
  if (deleted > 0) {
    logger.debug("connection_call_active_meta_cleared", { roomId });
  }
}

export async function finalizeConnectionCallHistory(roomId: string): Promise<void> {
  const redis = getRedis();
  const raw = await redis.get(CONNECTION_CALL_KEYS.activeByRoom(roomId));
  if (!raw) {
    logger.debug("connection_call_history_finalize_skipped", { roomId, reason: "no_active_meta" });
    return;
  }

  const logged = await redis.set(
    CONNECTION_CALL_KEYS.historyLogged(roomId),
    "1",
    "EX",
    3600,
    "NX",
  );
  if (logged !== "OK") {
    logger.debug("connection_call_history_finalize_skipped", { roomId, reason: "already_logged" });
    return;
  }

  let meta: ActiveConnectionCallMeta;
  try {
    meta = JSON.parse(raw) as ActiveConnectionCallMeta;
  } catch (error) {
    logger.error("connection_call_history_finalize_parse_failed", { roomId, error });
    await redis.del(CONNECTION_CALL_KEYS.activeByRoom(roomId));
    return;
  }

  const durationSec = Math.max(0, Math.floor((Date.now() - meta.acceptedAt) / 1000));

  try {
    await recordConnectionCallHistory({
      conversationId: meta.conversationId,
      callerUserId: meta.callerUserId,
      mode: meta.mode,
      status: "completed",
      durationSec: durationSec > 0 ? durationSec : null,
    });
  } catch (error) {
    logger.error("connection_call_history_finalize_record_failed", {
      roomId,
      requestId: meta.requestId,
      conversationId: meta.conversationId,
      durationSec,
      error,
    });
    throw error;
  }

  await redis.del(CONNECTION_CALL_KEYS.activeByRoom(roomId));

  logger.info("connection_call_history_finalized", {
    roomId,
    requestId: meta.requestId,
    conversationId: meta.conversationId,
    callerUserId: meta.callerUserId,
    calleeUserId: meta.calleeUserId,
    mode: meta.mode,
    durationSec,
  });
}
