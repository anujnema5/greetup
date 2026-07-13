import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";

import {
  getWelcomeTourStatusService,
  markWelcomeTourSeenService,
} from "../services/welcome-tour.service";

export const handleGetWelcomeTourStatus = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const result = await getWelcomeTourStatusService(userId);
    return c.json(ApiResponse.success(result, "Welcome tour status retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("Get welcome tour status error", { error });
    return internalError(c, error, "WELCOME_TOUR_STATUS_FAILED");
  }
};

export const handleMarkWelcomeTourSeen = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    await markWelcomeTourSeenService(userId);
    return c.json(ApiResponse.success(null, "Welcome tour marked as seen", 200), 200);
  } catch (error: unknown) {
    logger.error("Mark welcome tour seen error", { error });
    return internalError(c, error, "WELCOME_TOUR_SEEN_FAILED");
  }
};
