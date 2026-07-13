import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";

import { onlinePeopleCountForUser } from "../services/online-people-count.service";

export const handleOnlinePeopleCount = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const onlinePeopleCount = await onlinePeopleCountForUser(userId);
    return c.json(
      ApiResponse.success({ onlinePeopleCount }, "Online people count retrieved", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("Online people count error", { error });
    return internalError(c, error, "ONLINE_PEOPLE_COUNT_FAILED");
  }
};
