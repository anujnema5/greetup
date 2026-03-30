import type { Context } from "hono";
import type { FindMatchRequest } from "@/contracts/matchmaking.contracts";
import { MatchOrchestratorService } from "@/matchmaking/application/match-orchestrator.service";

const orchestrator = new MatchOrchestratorService();

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
    return c.json({ ok: false, error: "internal_error", detail: String(error) }, 500);
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
    return c.json({ ok: false, error: "internal_error", detail: String(error) }, 500);
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
    return c.json({ ok: false, error: "internal_error", detail: String(error) }, 500);
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
    return c.json({ ok: false, error: "internal_error", detail: String(error) }, 500);
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
    return c.json({ ok: false, error: "internal_error", detail: String(error) }, 500);
  }
};
