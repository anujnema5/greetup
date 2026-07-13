import logger from "@/core/logging";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

import type { UserMatchState } from "../types/match.types";
import {
  assertMatchEngineOk,
  matchEngineRequest,
} from "./match-engine-client";

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

/** @deprecated Import from `@/modules/rooms/services/participation/leave-direct-room.service` */
export { leaveDirectRoomService as leaveRoomService } from "@/modules/rooms/services/participation/leave-direct-room.service";
