import { env } from "@/config/env";
import { logger } from "@/core/logger";

type MatchCompletedPayload = {
  attemptId: string;
  userA: string;
  userB: string;
  roomId: string;
  matchScore: number;
  isFallbackMatch: boolean;
};

export class MatchWebhookService {
  async notifyMatchCompleted(payload: MatchCompletedPayload): Promise<void> {
    if (!env.matchWebhookUrl) return;

    try {
      const response = await fetch(`${env.matchWebhookUrl}/webhook/match-completed`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        logger.warn("Match webhook returned non-OK status", {
          status: response.status,
          attemptId: payload.attemptId,
        });
      }
    } catch (err) {
      logger.warn("Match webhook call failed", { error: err, attemptId: payload.attemptId });
    }
  }
}
