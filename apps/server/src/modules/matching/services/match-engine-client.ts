import config from "@/shared/config/config";
import logger from "@/core/logging";

const MATCH_ENGINE_URL = config.matchEngineUrl;

function buildMatchEngineHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-internal-api-key": config.internalApiKey,
  };
}

export async function matchEngineRequest(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const timeoutMs = config.matchEngineTimeoutMs;
  return fetch(`${MATCH_ENGINE_URL}${path}`, {
    method,
    headers: buildMatchEngineHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    ...(timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });
}

export async function assertMatchEngineOk(res: Response, label: string): Promise<void> {
  if (res.ok) {
    return;
  }
  const text = await res.text();
  logger.error(`${label} failed`, { status: res.status, body: text });
  throw new Error("Match engine error");
}

export async function leaveMatchEngineRoom(userId: string): Promise<void> {
  const res = await matchEngineRequest("POST", "/match/leave-room", { userId });
  await assertMatchEngineOk(res, "Match engine /match/leave-room");
}
