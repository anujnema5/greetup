import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";

import { toGuestStatusApiResponse } from "../lib/to-guest-status-api-response";
import { getGuestCallTrialStatus } from "../services/status/get-guest-call-trial-status.service";

export const handleGetGuestStatus = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const status = await getGuestCallTrialStatus(userId);
    const data = toGuestStatusApiResponse(status);
    return c.json(ApiResponse.success(data, "Guest status", 200), 200);
  } catch (error: unknown) {
    logger.error("get_guest_status_failed", { error });
    return internalError(c, error, "GUEST_STATUS_FAILED");
  }
};
