import { env } from "@/shared/config/env";
import { logger } from "@/core/logging";
import type {
  EnsureSnapshotApiSuccessBody,
  MatchCompletedPayload,
  MatchFailedPayload,
  MatchProposalCancelledPayload,
  MatchProposedPayload,
  WebhookPostResult,
} from "@/modules/simple-matching/types/webhook.types";

/** Keep webhook calls inside the match-engine HTTP budget (avoids DO via_upstream). */
const WEBHOOK_TIMEOUT_MS = 4_000;

export class MatchWebhookService {
  private async post(
    path: string,
    payload: Record<string, unknown>,
    meta: Record<string, unknown>,
  ): Promise<WebhookPostResult> {
    if (!env.matchWebhookUrl) {
      logger.warn("[MatchWebhookService] matchWebhookUrl is not set — skipping webhook", meta);
      return { ok: false };
    }

    const url = `${env.matchWebhookUrl}${path}`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-api-key": env.internalApiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        return { ok: false, status: response.status, body };
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return { ok: true, status: response.status, json: await response.json() };
      }
      return { ok: true, status: response.status };
    } catch (error) {
      return { ok: false, error };
    }
  }

  /** Asks the main API to load the profile from DB and write `user:profile:snapshot:{userId}` in Redis. */
  async requestEnsureProfileSnapshot(userId: string): Promise<boolean> {
    const meta = { userId };
    logger.info("[MatchWebhookService] ensure profile snapshot", meta);

    const result = await this.post(
      "/webhook/ensure-profile-snapshot",
      { userId },
      meta,
    );

    if (!result.ok) {
      logger.warn("[MatchWebhookService] ensure snapshot failed", {
        ...meta,
        status: result.status,
        body: result.body,
        error: result.error,
      });
      return false;
    }

    const json = result.json as EnsureSnapshotApiSuccessBody | undefined;
    return json?.success === true && json.data?.cached === true;
  }

  async notifyMatchFailed(payload: MatchFailedPayload): Promise<void> {
    const meta = { attemptId: payload.attemptId, userId: payload.userId, reason: payload.reason };
    logger.info("[MatchWebhookService] firing no-match webhook", meta);

    const result = await this.post("/webhook/match-failed", payload, meta);
    if (!result.ok) {
      logger.warn("[MatchWebhookService] no-match webhook failed", {
        ...meta,
        status: result.status,
        body: result.body,
        error: result.error,
      });
      return;
    }
    logger.info("[MatchWebhookService] no-match webhook delivered", {
      attemptId: payload.attemptId,
      status: result.status,
    });
  }

  async notifyMatchProposed(payload: MatchProposedPayload): Promise<void> {
    const meta = { userA: payload.userA, userB: payload.userB };
    logger.info("[MatchWebhookService] match-proposed webhook", meta);

    const result = await this.post("/webhook/match-proposed", payload, meta);
    if (!result.ok) {
      logger.warn("[MatchWebhookService] match-proposed failed", {
        ...meta,
        status: result.status,
        body: result.body,
        error: result.error,
      });
    }
  }

  async notifyMatchProposalCancelled(payload: MatchProposalCancelledPayload): Promise<void> {
    const meta = { userId: payload.userId, attemptId: payload.attemptId, reason: payload.reason };
    const result = await this.post("/webhook/match-proposal-cancelled", payload, meta);
    if (!result.ok) {
      logger.warn("[MatchWebhookService] proposal-cancelled failed", {
        ...meta,
        status: result.status,
        body: result.body,
        error: result.error,
      });
    }
  }

  async notifyMatchCompleted(payload: MatchCompletedPayload): Promise<void> {
    const meta = {
      attemptId: payload.attemptId,
      userA: payload.userA,
      userB: payload.userB,
      roomId: payload.roomId,
    };
    logger.info("[MatchWebhookService] firing match-completed webhook", meta);

    const result = await this.post("/webhook/match-completed", payload, meta);
    if (!result.ok) {
      logger.warn("[MatchWebhookService] match-completed failed", {
        ...meta,
        status: result.status,
        body: result.body,
        error: result.error,
      });
      return;
    }
    logger.info("[MatchWebhookService] match-completed delivered", {
      attemptId: payload.attemptId,
      status: result.status,
    });
  }
}
