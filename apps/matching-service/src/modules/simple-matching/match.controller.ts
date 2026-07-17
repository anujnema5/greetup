import type { Context } from "hono";
import type { FindMatchRequest } from "@/modules/simple-matching/types";
import { MatchOrchestratorService } from "@/modules/simple-matching/orchestrator";
import { logger } from "@/core/logging";

const orchestrator = new MatchOrchestratorService();

const redisOrInternalError = (error: unknown) => {
  const detail = String(error);
  const timedOut = /command timed out/i.test(detail);
  return {
    body: {
      ok: false as const,
      error: timedOut ? "redis_timeout" : "internal_error",
      detail,
    },
    status: (timedOut ? 503 : 500) as 503 | 500,
  };
};

const parseBody = async (request: Request): Promise<FindMatchRequest | null> => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const body = payload as Record<string, unknown>;
  const userId = body.userId;
  const requestId = body.requestId;

  if (
    typeof userId !== "string" ||
    userId.trim().length === 0 ||
    typeof requestId !== "string" ||
    requestId.trim().length === 0
  ) {
    return null;
  }

  return {
    userId: userId.trim(),
    requestId: requestId.trim(),
  };
};

export const handleFindMatch = async (c: Context): Promise<Response> => {
  const body = await parseBody(c.req.raw);
  if (!body) {
    return c.json(
      { ok: false, error: "invalid_body", hint: "expected { userId, requestId }" },
      400,
    );
  }

  try {
    const result = await orchestrator.startFindMatch(body);
    return c.json({ ok: true, data: result }, 200);
  } catch (error) {
    const { body: errBody, status } = redisOrInternalError(error);
    logger.error("[handleFindMatch] failed", {
      userId: body.userId,
      requestId: body.requestId,
      detail: errBody.detail,
      redisTimeout: status === 503,
    });
    return c.json(errBody, status);
  }
};

export const handleGetMatchResult = async (c: Context): Promise<Response> => {
  const requestId = decodeURIComponent(c.req.param("requestId") ?? "");

  if (requestId.trim().length === 0) {
    return c.json(
      { ok: false, error: "invalid_request_id", hint: "expected /match/result/:requestId" },
      400,
    );
  }

  try {
    const result = await orchestrator.getMatchResult(requestId);
    return c.json({ ok: true, data: result }, 200);
  } catch (error) {
    const { body: errBody, status } = redisOrInternalError(error);
    return c.json(errBody, status);
  }
};

export const handleGetUserMatchState = async (c: Context): Promise<Response> => {
  const userId = decodeURIComponent(c.req.param("userId") ?? "").trim();

  if (!userId) {
    return c.json({ ok: false, error: "invalid_user_id" }, 400);
  }

  try {
    const state = await orchestrator.getUserMatchState(userId);
    return c.json({ ok: true, data: state }, 200);
  } catch (error) {
    const { body: errBody, status } = redisOrInternalError(error);
    logger.error("[handleGetUserMatchState] failed", {
      userId,
      detail: errBody.detail,
      redisTimeout: status === 503,
    });
    return c.json(errBody, status);
  }
};

export const handleCancelMatch = async (c: Context): Promise<Response> => {
  let userId: string;
  try {
    const body = await c.req.json();
    userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  } catch {
    return c.json({ ok: false, error: "invalid_body" }, 400);
  }

  if (!userId) {
    return c.json({ ok: false, error: "userId is required" }, 400);
  }

  try {
    await orchestrator.cancelMatch(userId);
    return c.json({ ok: true }, 200);
  } catch (error) {
    const { body: errBody, status } = redisOrInternalError(error);
    return c.json(errBody, status);
  }
};

export const handleMatchRespond = async (c: Context): Promise<Response> => {
  let userId: string;
  let attemptId: string;
  let decision: string;
  try {
    const body = await c.req.json();
    userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    attemptId = typeof body?.attemptId === "string" ? body.attemptId.trim() : "";
    decision = typeof body?.decision === "string" ? body.decision.trim() : "";
  } catch {
    return c.json({ ok: false, error: "invalid_body" }, 400);
  }

  if (!userId || !attemptId || (decision !== "connect" && decision !== "skip")) {
    return c.json(
      { ok: false, error: "invalid_body", hint: "expected { userId, attemptId, decision: connect|skip }" },
      400,
    );
  }

  try {
    const result = await orchestrator.respondToMatchProposal(userId, attemptId, decision);
    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400);
    }
    return c.json({ ok: true }, 200);
  } catch (error) {
    const { body: errBody, status } = redisOrInternalError(error);
    return c.json(errBody, status);
  }
};

export const handleLeaveRoom = async (c: Context): Promise<Response> => {
  let userId: string;
  try {
    const body = await c.req.json();
    userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  } catch {
    return c.json({ ok: false, error: "invalid_body" }, 400);
  }

  if (!userId) {
    return c.json({ ok: false, error: "userId is required" }, 400);
  }

  try {
    await orchestrator.leaveRoom(userId);
    return c.json({ ok: true }, 200);
  } catch (error) {
    const { body: errBody, status } = redisOrInternalError(error);
    return c.json(errBody, status);
  }
};
