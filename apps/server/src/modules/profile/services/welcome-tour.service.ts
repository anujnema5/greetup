import logger from "@/core/logging";

import { welcomeTourRepository } from "../repositories/welcome-tour.repository";
import type { WelcomeTourStatusResponse } from "../types/welcome-tour.types";

export async function getWelcomeTourStatusService(
  userId: string,
): Promise<WelcomeTourStatusResponse> {
  const { isOnboarded, welcomeTourSeenAt } = await welcomeTourRepository.getStatus(userId);

  const result: WelcomeTourStatusResponse = {
    eligible: isOnboarded && welcomeTourSeenAt == null,
    seenAt: welcomeTourSeenAt?.toISOString() ?? null,
  };

  logger.debug("welcome_tour_status_fetched", { userId, ...result });
  return result;
}

export async function markWelcomeTourSeenService(userId: string): Promise<void> {
  const { welcomeTourSeenAt } = await welcomeTourRepository.getStatus(userId);
  if (welcomeTourSeenAt != null) {
    logger.debug("welcome_tour_already_seen", { userId, seenAt: welcomeTourSeenAt.toISOString() });
    return;
  }

  await welcomeTourRepository.markSeen(userId, new Date());
  logger.info("welcome_tour_marked_seen", { userId });
}
