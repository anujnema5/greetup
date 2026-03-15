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

export const handleFindMatch = async (request: Request): Promise<Response> => {
  const body = await parseBody(request);
  if (!body) {
    return Response.json(
      { ok: false, error: "invalid_body", hint: "expected { userId, requestId }" },
      { status: 400 },
    );
  }

  try {
    const result = await orchestrator.startFindMatch(body);
    return Response.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    return Response.json(
      { ok: false, error: "internal_error", detail: String(error) },
      { status: 500 },
    );
  }
};

export const handleGetMatchResult = async (requestId: string): Promise<Response> => {
  if (requestId.trim().length === 0) {
    return Response.json(
      { ok: false, error: "invalid_request_id", hint: "expected /match/result/:requestId" },
      { status: 400 },
    );
  }

  try {
    const result = await orchestrator.getMatchResult(requestId);
    return Response.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    return Response.json(
      { ok: false, error: "internal_error", detail: String(error) },
      { status: 500 },
    );
  }
};
