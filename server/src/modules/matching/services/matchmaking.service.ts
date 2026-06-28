import config from "@/shared/config/config";
import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { emitConnectionCallEnded } from "@/modules/connections/socket/connection-call-socket.handler";
import { resolveConnectionCallConversationId } from "@/modules/rooms/lib/session/resolve-connection-call-conversation-id";
import { clearUserActiveRtcRoom, getUserActiveRtcRoomId } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { finalizeConnectionCallRoomSession } from "@/modules/rooms/services/direct/finalize-connection-call-room.service";
import { finalizeDirectMatchRoomSession } from "@/modules/rooms/services/direct/finalize-direct-match-room.service";
import { leaveSpaceRtcSessionInternal } from "@/modules/rooms/services/participation/leave-space-rtc-session.service";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";

import type { UserMatchState } from "../types/match.types";

const MATCH_ENGINE_URL = config.matchEngineUrl;
const MATCH_ENGINE_AUDIENCE = config.matchEngineAuthAudience ?? MATCH_ENGINE_URL;
const METADATA_IDENTITY_ENDPOINT =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const TOKEN_FALLBACK_TTL_MS = 5 * 60_000;

type CachedAudienceToken = {
  audience: string;
  token: string;
  expiresAtMs: number;
};

let cachedAudienceToken: CachedAudienceToken | null = null;

function isHttpsAudience(audience: string): boolean {
  return audience.startsWith("https://");
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };

    if (!parsed.exp || !Number.isFinite(parsed.exp)) {
      return null;
    }

    return parsed.exp * 1000;
  } catch {
    return null;
  }
}

function getCachedTokenForAudience(audience: string): string | null {
  const now = Date.now();
  if (
    cachedAudienceToken &&
    cachedAudienceToken.audience === audience &&
    now < cachedAudienceToken.expiresAtMs - TOKEN_REFRESH_BUFFER_MS
  ) {
    return cachedAudienceToken.token;
  }
  return null;
}

function buildMetadataIdentityUrl(audience: string): string {
  const tokenUrl = new URL(METADATA_IDENTITY_ENDPOINT);
  tokenUrl.searchParams.set("audience", audience);
  tokenUrl.searchParams.set("format", "full");
  return tokenUrl.toString();
}

async function requestCloudRunIdToken(audience: string): Promise<string | null> {
  const metadataUrl = buildMetadataIdentityUrl(audience);

  const response = await fetch(metadataUrl, {
    headers: { "Metadata-Flavor": "Google" },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn("Failed to fetch Cloud Run identity token for match engine", {
      status: response.status,
      body,
    });
    return null;
  }

  const token = (await response.text()).trim();
  if (!token) {
    logger.warn("Cloud Run identity token for match engine was empty");
    return null;
  }

  return token;
}

function cacheToken(audience: string, token: string): void {
  cachedAudienceToken = {
    audience,
    token,
    expiresAtMs: decodeJwtExpiryMs(token) ?? Date.now() + TOKEN_FALLBACK_TTL_MS,
  };
}

async function getCloudRunIdToken(audience: string): Promise<string | null> {
  if (!isHttpsAudience(audience)) {
    return null;
  }

  const cachedToken = getCachedTokenForAudience(audience);
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const token = await requestCloudRunIdToken(audience);
    if (!token) {
      return null;
    }
    cacheToken(audience, token);
    return token;
  } catch (error) {
    logger.warn("Unable to fetch Cloud Run identity token for match engine", { error });
    return null;
  }
}

async function buildMatchEngineHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-internal-api-key": config.internalApiKey,
  };

  const idToken = await getCloudRunIdToken(MATCH_ENGINE_AUDIENCE);
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  return headers;
}

async function matchEngineRequest(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${MATCH_ENGINE_URL}${path}`, {
    method,
    headers: await buildMatchEngineHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function assertMatchEngineOk(res: Response, label: string): Promise<void> {
  if (res.ok) {
    return;
  }
  const text = await res.text();
  logger.error(`${label} failed`, { status: res.status, body: text });
  throw new Error("Match engine error");
}

/**
 * Only finalize the RTC room the client was actually connected to.
 * Do not use `findLiveDirectRoomIdForParticipant` — after rematch it can return the
 * brand-new matched room and `finalizeDirectMatchRoomSession` ends it before join.
 */
async function directRoomIdForExplicitLeave(
  userId: string,
  explicitRoomId?: string | null,
): Promise<string | null> {
  const trimmed = explicitRoomId?.trim();
  if (trimmed) return trimmed;
  return getUserActiveRtcRoomId(userId);
}

/** Tells the remaining 1:1 match peer to rematch when the other user skips or leaves. */
async function notifyDirectMatchPeerSkipped(roomId: string, skippingUserId: string): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "direct" || room.sessionKind !== "match") {
    return;
  }

  const participantIds = await roomParticipantsRepository.listAllParticipantUserIds(roomId);
  const peerUserId = participantIds.find((id) => id !== skippingUserId);
  if (!peerUserId) {
    return;
  }

  logger.info("[leaveRoom] notifying peer to rematch after partner skip", {
    roomId,
    skippingUserId,
    peerUserId,
  });
  emitToUser(peerUserId, "match:partner_skipped", { roomId });
}

/** Tells the remaining connection-call peer to hang up when the other user leaves. */
async function notifyConnectionCallPeerEnded(roomId: string, leavingUserId: string): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.sessionKind !== "connection_call") {
    return;
  }

  const activeParticipantIds = await roomParticipantsRepository.listActiveParticipantUserIds(roomId);
  const peerUserId = activeParticipantIds.find((id) => id !== leavingUserId);
  if (!peerUserId) {
    return;
  }

  const conversationId = (await resolveConnectionCallConversationId(roomId)) ?? "";

  logger.info("[leaveRoom] notifying peer connection call ended", {
    roomId,
    leavingUserId,
    peerUserId,
  });
  emitConnectionCallEnded(peerUserId, {
    roomId,
    conversationId,
    endedByUserId: leavingUserId,
  });
}

export const findMatchService = async (userId: string, requestId: string) => {
  const res = await matchEngineRequest("POST", "/match/find", { userId, requestId });
  await assertMatchEngineOk(res, "Match engine /match/find");
  return res.json();
};

export const getMatchResultService = async (requestId: string) => {
  const res = await matchEngineRequest(
    "GET",
    `/match/result/${encodeURIComponent(requestId)}`,
  );
  await assertMatchEngineOk(res, "Match engine /match/result");
  return res.json();
};

export const getUserMatchStateService = async (userId: string): Promise<UserMatchState> => {
  try {
    const res = await matchEngineRequest(
      "GET",
      `/match/state/user/${encodeURIComponent(userId)}`,
    );

    if (!res.ok) {
      logger.warn("Match engine /match/state/user failed", { status: res.status, userId });
      return { status: "idle" };
    }

    const json = await res.json();
    return json.data as UserMatchState;
  } catch (err) {
    logger.warn("getUserMatchStateService threw, returning idle", { userId, err });
    return { status: "idle" };
  }
};

export const cancelMatchService = async (userId: string): Promise<void> => {
  try {
    const res = await matchEngineRequest("POST", "/match/cancel", { userId });
    await assertMatchEngineOk(res, "Match engine /match/cancel");
  } finally {
    await clearUserActiveRtcRoom(userId);
  }
};

export const leaveRoomService = async (
  userId: string,
  explicitRoomId?: string | null,
): Promise<void> => {
  const roomId = await directRoomIdForExplicitLeave(userId, explicitRoomId);
  const room = roomId ? await roomsRepository.findRoomById(roomId) : null;
  const isConnectionCall = room?.sessionKind === "connection_call";

  if (roomId && room?.roomType === "direct" && room.sessionKind === "match") {
    await notifyDirectMatchPeerSkipped(roomId, userId);
  }

  try {
    if (!isConnectionCall) {
      const res = await matchEngineRequest("POST", "/match/leave-room", { userId });
      await assertMatchEngineOk(res, "Match engine /match/leave-room");
    }
  } finally {
    if (roomId && room) {
      if (room.roomType === "space") {
        await leaveSpaceRtcSessionInternal(userId, roomId);
      } else if (room.sessionKind === "connection_call") {
        await notifyConnectionCallPeerEnded(roomId, userId);
        await roomParticipantsRepository.markParticipantLeft(roomId, userId);
        await finalizeConnectionCallRoomSession(roomId);
      } else if (room.roomType === "direct") {
        await finalizeDirectMatchRoomSession(roomId);
      }
    }
    await clearUserActiveRtcRoom(userId);
  }
};

export const respondMatchProposalService = async (
  userId: string,
  attemptId: string,
  decision: "connect" | "skip",
): Promise<void> => {
  const res = await matchEngineRequest("POST", "/match/respond", {
    userId,
    attemptId,
    decision,
  });
  await assertMatchEngineOk(res, "Match engine /match/respond");
  await clearUserActiveRtcRoom(userId);
};
