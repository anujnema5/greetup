import { env } from "@/shared/config/env";
import { logger } from "@/core/logging";

type MatchCompletedPayload = {
  attemptId: string;
  userA: string;
  userB: string;
  roomId: string;
  matchScore: number;
  isFallbackMatch: boolean;
};

type MatchFailedPayload = {
  attemptId: string;
  userId: string;
  reason: string;
};

type MatchProposedPayload = {
  userA: string;
  userB: string;
  attemptIdA: string;
  attemptIdB: string;
  matchScore: number;
  isFallbackMatch: boolean;
};

type MatchProposalCancelledPayload = {
  userId: string;
  attemptId: string;
  reason: string;
};

type ApiSuccessBody = {
  success?: boolean;
  data?: { cached?: boolean };
};

export class MatchWebhookService {
  /** Asks the main API to load the profile from DB and write `user:profile:snapshot:{userId}` in Redis. */
  async requestEnsureProfileSnapshot(userId: string): Promise<boolean> {
    if (!env.matchWebhookUrl) {
      logger.warn("[MatchWebhookService] matchWebhookUrl is not set — cannot hydrate snapshot", { userId });
      return false;
    }

    const url = `${env.matchWebhookUrl}/webhook/ensure-profile-snapshot`;
    logger.info("[MatchWebhookService] ensure profile snapshot", { url, userId });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.warn("[MatchWebhookService] ensure snapshot returned non-OK", { status: response.status, body, userId });
        return false;
      }

      const json = (await response.json()) as ApiSuccessBody;
      return json.success === true && json.data?.cached === true;
    } catch (err) {
      logger.warn("[MatchWebhookService] ensure snapshot request failed", { error: err, userId });
      return false;
    }
  }

  async notifyMatchFailed(payload: MatchFailedPayload): Promise<void> {
    if (!env.matchWebhookUrl) {
      logger.warn("[MatchWebhookService] matchWebhookUrl is not set — skipping no-match webhook", { attemptId: payload.attemptId });
      return;
    }

    const url = `${env.matchWebhookUrl}/webhook/match-failed`;
    logger.info("[MatchWebhookService] firing no-match webhook", { url, attemptId: payload.attemptId, userId: payload.userId, reason: payload.reason });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.warn("[MatchWebhookService] no-match webhook returned non-OK status", { status: response.status, body, attemptId: payload.attemptId });
      } else {
        logger.info("[MatchWebhookService] no-match webhook delivered successfully", { attemptId: payload.attemptId, status: response.status });
      }
    } catch (err) {
      logger.warn("[MatchWebhookService] no-match webhook call threw — server may be unreachable", { error: err, url, attemptId: payload.attemptId });
    }
  }

  async notifyMatchProposed(payload: MatchProposedPayload): Promise<void> {
    if (!env.matchWebhookUrl) {
      logger.warn("[MatchWebhookService] matchWebhookUrl is not set — skipping match-proposed webhook");
      return;
    }

    const url = `${env.matchWebhookUrl}/webhook/match-proposed`;
    logger.info("[MatchWebhookService] match-proposed webhook", { url, userA: payload.userA, userB: payload.userB });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.warn("[MatchWebhookService] match-proposed returned non-OK", { status: response.status, body });
      }
    } catch (err) {
      logger.warn("[MatchWebhookService] match-proposed threw", { error: err, url });
    }
  }

  async notifyMatchProposalCancelled(payload: MatchProposalCancelledPayload): Promise<void> {
    if (!env.matchWebhookUrl) {
      logger.warn("[MatchWebhookService] matchWebhookUrl is not set — skipping proposal-cancelled webhook");
      return;
    }

    const url = `${env.matchWebhookUrl}/webhook/match-proposal-cancelled`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.warn("[MatchWebhookService] proposal-cancelled returned non-OK", { status: response.status, body });
      }
    } catch (err) {
      logger.warn("[MatchWebhookService] proposal-cancelled threw", { error: err, url });
    }
  }

  async notifyMatchCompleted(payload: MatchCompletedPayload): Promise<void> {
    if (!env.matchWebhookUrl) {
      logger.warn("[MatchWebhookService] matchWebhookUrl is not set — skipping webhook", { attemptId: payload.attemptId });
      return;
    }

    const url = `${env.matchWebhookUrl}/webhook/match-completed`;
    logger.info("[MatchWebhookService] firing webhook", { url, attemptId: payload.attemptId, userA: payload.userA, userB: payload.userB, roomId: payload.roomId });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.warn("[MatchWebhookService] webhook returned non-OK status", {
          status: response.status,
          body,
          attemptId: payload.attemptId,
        });
      } else {
        logger.info("[MatchWebhookService] webhook delivered successfully", { attemptId: payload.attemptId, status: response.status });
      }
    } catch (err) {
      logger.warn("[MatchWebhookService] webhook call threw — server may be unreachable", { error: err, url, attemptId: payload.attemptId });
    }
  }
}
