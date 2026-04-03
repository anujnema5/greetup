import config from "@/shared/config/config";
import logger from "@/core/logging";

import type { UserMatchState } from "../types/match.types";

const MATCH_ENGINE_URL = config.matchEngineUrl;

const engineHeaders = () => ({
  "Content-Type": "application/json",
  "x-internal-api-key": config.internalApiKey,
});

export const findMatchService = async (userId: string, requestId: string) => {
  const res = await fetch(`${MATCH_ENGINE_URL}/match/find`, {
    method: "POST",
    headers: engineHeaders(),
    body: JSON.stringify({ userId, requestId }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Match engine /match/find failed", { status: res.status, body: text });
    throw new Error("Match engine error");
  }

  return res.json();
};

export const getMatchResultService = async (requestId: string) => {
  const res = await fetch(`${MATCH_ENGINE_URL}/match/result/${encodeURIComponent(requestId)}`, {
    headers: engineHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Match engine /match/result failed", { status: res.status, body: text });
    throw new Error("Match engine error");
  }

  return res.json();
};

export const getUserMatchStateService = async (userId: string): Promise<UserMatchState> => {
  try {
    const res = await fetch(`${MATCH_ENGINE_URL}/match/state/user/${encodeURIComponent(userId)}`, {
      headers: engineHeaders(),
    });

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
  const res = await fetch(`${MATCH_ENGINE_URL}/match/cancel`, {
    method: "POST",
    headers: engineHeaders(),
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Match engine /match/cancel failed", { status: res.status, body: text });
    throw new Error("Match engine error");
  }
};

export const leaveRoomService = async (userId: string): Promise<void> => {
  const res = await fetch(`${MATCH_ENGINE_URL}/match/leave-room`, {
    method: "POST",
    headers: engineHeaders(),
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Match engine /match/leave-room failed", { status: res.status, body: text });
    throw new Error("Match engine error");
  }
};
