import logger from "@/core/logging";
import { ServiceUnavailableError } from "@/shared/errors";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

import type { UserMatchState } from "../types/match.types";
import {
  assertMatchEngineOk,
  matchEngineRequest,
} from "./match-engine-client";

export const findMatchService = async (userId: string, requestId: string) => {
  try {
    const res = await matchEngineRequest("POST", "/match/find", { userId, requestId });
    await assertMatchEngineOk(res, "Match engine /match/find");
    return res.json();
  } catch (err) {
    if (err instanceof ServiceUnavailableError) throw err;
    if (
      typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      logger.error("Match engine /match/find timed out", { userId, requestId });
      throw new ServiceUnavailableError("Matching is temporarily unavailable. Please try again.");
    }
    throw err;
  }
};

export const getMatchResultService = async (requestId: string) => {
  const res = await matchEngineRequest(
    "GET",
    `/match/result/${encodeURIComponent(requestId)}`,
  );
  await assertMatchEngineOk(res, "Match engine /match/result");
  return res.json();
};

type GetUserMatchStateOptions = {
  /**
   * When true, engine 5xx/network errors throw SERVICE_UNAVAILABLE instead of
   * pretending the user is idle (used by find-match to avoid cascading find failures).
   */
  requireEngine?: boolean;
};

export const getUserMatchStateService = async (
  userId: string,
  opts?: GetUserMatchStateOptions,
): Promise<UserMatchState> => {
  try {
    const res = await matchEngineRequest(
      "GET",
      `/match/state/user/${encodeURIComponent(userId)}`,
    );

    if (!res.ok) {
      logger.warn("Match engine /match/state/user failed", { status: res.status, userId });
      if (opts?.requireEngine) {
        throw new ServiceUnavailableError("Matching is temporarily unavailable. Please try again.");
      }
      return { status: "idle" };
    }

    const json = await res.json();
    return json.data as UserMatchState;
  } catch (err) {
    if (err instanceof ServiceUnavailableError) throw err;
    logger.warn("getUserMatchStateService threw", { userId, err });
    if (opts?.requireEngine) {
      throw new ServiceUnavailableError("Matching is temporarily unavailable. Please try again.");
    }
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
