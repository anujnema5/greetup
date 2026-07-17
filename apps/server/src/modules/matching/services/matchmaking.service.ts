import logger from "@/core/logging";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

import type { GetUserMatchStateOptions, UserMatchState } from "../types/match.types";
import {
  assertMatchEngineOk,
  matchEngineRequest,
  matchEngineUnavailable,
  rethrowMatchEngineFailure,
} from "./match-engine-client";

export const findMatchService = async (userId: string, requestId: string) => {
  try {
    const res = await matchEngineRequest("POST", "/match/find", { userId, requestId });
    await assertMatchEngineOk(res, "Match engine /match/find");
    return res.json();
  } catch (err) {
    rethrowMatchEngineFailure(err, "Match engine /match/find");
  }
};

export const getMatchResultService = async (requestId: string) => {
  try {
    const res = await matchEngineRequest(
      "GET",
      `/match/result/${encodeURIComponent(requestId)}`,
    );
    await assertMatchEngineOk(res, "Match engine /match/result");
    return res.json();
  } catch (err) {
    rethrowMatchEngineFailure(err, "Match engine /match/result");
  }
};

function parseUserMatchState(json: unknown): UserMatchState | null {
  if (typeof json !== "object" || json === null) return null;
  const data = (json as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return null;
  const status = (data as { status?: unknown }).status;
  if (typeof status !== "string") return null;
  return data as UserMatchState;
}

export const getUserMatchStateService = async (
  userId: string,
  opts?: GetUserMatchStateOptions,
): Promise<UserMatchState> => {
  const requireEngine = opts?.requireEngine === true;

  try {
    const res = await matchEngineRequest(
      "GET",
      `/match/state/user/${encodeURIComponent(userId)}`,
    );

    if (!res.ok) {
      logger.warn("Match engine /match/state/user failed", { status: res.status, userId });
      if (requireEngine) throw matchEngineUnavailable();
      return { status: "idle" };
    }

    const state = parseUserMatchState(await res.json());
    if (!state) {
      logger.warn("Match engine /match/state/user returned invalid payload", { userId });
      if (requireEngine) throw matchEngineUnavailable();
      return { status: "idle" };
    }
    return state;
  } catch (err) {
    if (requireEngine) {
      rethrowMatchEngineFailure(err, "Match engine /match/state/user");
    }
    logger.warn("getUserMatchStateService threw, returning idle", { userId, err });
    return { status: "idle" };
  }
};

export const cancelMatchService = async (userId: string): Promise<void> => {
  try {
    const res = await matchEngineRequest("POST", "/match/cancel", { userId });
    await assertMatchEngineOk(res, "Match engine /match/cancel");
  } catch (err) {
    rethrowMatchEngineFailure(err, "Match engine /match/cancel");
  } finally {
    await clearUserActiveRtcRoom(userId);
  }
};

export const respondMatchProposalService = async (
  userId: string,
  attemptId: string,
  decision: "connect" | "skip",
): Promise<void> => {
  try {
    const res = await matchEngineRequest("POST", "/match/respond", {
      userId,
      attemptId,
      decision,
    });
    await assertMatchEngineOk(res, "Match engine /match/respond");
  } catch (err) {
    rethrowMatchEngineFailure(err, "Match engine /match/respond");
  }
  await clearUserActiveRtcRoom(userId);
};
