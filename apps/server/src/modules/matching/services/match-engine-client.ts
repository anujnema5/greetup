import config from "@/shared/config/config";
import logger from "@/core/logging";
import { ServiceUnavailableError } from "@/shared/errors";

const MATCH_ENGINE_URL = config.matchEngineUrl;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429, 502, 503, 504]);

function buildMatchEngineHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-internal-api-key": config.internalApiKey,
  };
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err.name === "TimeoutError" || err.name === "AbortError")
  );
}

function retryDelayMs(attempt: number): number {
  return 150 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function matchEngineRequest(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const timeoutMs = config.matchEngineTimeoutMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const startedAt = Date.now();
    try {
      const res = await fetch(`${MATCH_ENGINE_URL}${path}`, {
        method,
        headers: buildMatchEngineHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        ...(timeoutMs > 0 ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
      });

      if (!RETRYABLE_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) {
        return res;
      }

      logger.warn("Match engine returned retryable status", {
        path,
        method,
        status: res.status,
        attempt,
        elapsedMs: Date.now() - startedAt,
      });
      // Drain body so the connection can be reused.
      void res.text().catch(() => undefined);
    } catch (err) {
      lastError = err;
      const retryable = isAbortError(err) || err instanceof TypeError;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        throw err;
      }
      logger.warn("Match engine request failed, retrying", {
        path,
        method,
        attempt,
        elapsedMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await sleep(retryDelayMs(attempt));
  }

  throw lastError instanceof Error ? lastError : new Error("Match engine request failed");
}

export async function assertMatchEngineOk(res: Response, label: string): Promise<void> {
  if (res.ok) {
    return;
  }
  const text = await res.text();
  logger.error(`${label} failed`, { status: res.status, body: text });
  if (res.status >= 500 || res.status === 429) {
    throw new ServiceUnavailableError("Matching is temporarily unavailable. Please try again.");
  }
  throw new Error("Match engine error");
}

export async function leaveMatchEngineRoom(userId: string): Promise<void> {
  const res = await matchEngineRequest("POST", "/match/leave-room", { userId });
  await assertMatchEngineOk(res, "Match engine /match/leave-room");
}
