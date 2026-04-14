import config from "@/shared/config/config";
import logger from "@/core/logging";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";

import type { UserMatchState } from "../types/match.types";

const MATCH_ENGINE_URL = config.matchEngineUrl;

const engineHeaders = () => ({
  "Content-Type": "application/json",
  "x-internal-api-key": config.internalApiKey,
});

async function matchEnginePost(path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${MATCH_ENGINE_URL}${path}`, {
    method: "POST",
    headers: engineHeaders(),
    body: JSON.stringify(body),
  });
}

async function matchEngineGet(path: string): Promise<Response> {
  return fetch(`${MATCH_ENGINE_URL}${path}`, { headers: engineHeaders() });
}

async function assertMatchEngineOk(res: Response, label: string): Promise<void> {
  if (res.ok) {
    return;
  }
  const text = await res.text();
  logger.error(`${label} failed`, { status: res.status, body: text });
  throw new Error("Match engine error");
}

export const findMatchService = async (userId: string, requestId: string) => {
  const res = await matchEnginePost("/match/find", { userId, requestId });
  await assertMatchEngineOk(res, "Match engine /match/find");
  return res.json();
};

export const getMatchResultService = async (requestId: string) => {
  const res = await matchEngineGet(`/match/result/${encodeURIComponent(requestId)}`);
  await assertMatchEngineOk(res, "Match engine /match/result");
  return res.json();
};

export const getUserMatchStateService = async (userId: string): Promise<UserMatchState> => {
  try {
    const res = await matchEngineGet(`/match/state/user/${encodeURIComponent(userId)}`);

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
  const res = await matchEnginePost("/match/cancel", { userId });
  await assertMatchEngineOk(res, "Match engine /match/cancel");
  await clearUserActiveRtcRoom(userId);
};

export const leaveRoomService = async (userId: string): Promise<void> => {
  try {
    const res = await matchEnginePost("/match/leave-room", { userId });
    await assertMatchEngineOk(res, "Match engine /match/leave-room");
  } finally {
    await clearUserActiveRtcRoom(userId);
  }
};

export const respondMatchProposalService = async (
  userId: string,
  attemptId: string,
  decision: "connect" | "skip",
): Promise<void> => {
  const res = await matchEnginePost("/match/respond", { userId, attemptId, decision });
  await assertMatchEngineOk(res, "Match engine /match/respond");
  await clearUserActiveRtcRoom(userId);
};
