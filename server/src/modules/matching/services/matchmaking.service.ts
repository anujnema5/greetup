import config from "@/shared/config/config";
import logger from "@/core/logging";

const MATCH_ENGINE_URL = process.env.MATCH_ENGINE_URL ?? "http://localhost:5060";

export const findMatchService = async (userId: string, requestId: string) => {
  const res = await fetch(`${MATCH_ENGINE_URL}/match/find`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": config.internalApiKey,
    },
    body: JSON.stringify({ userId, requestId }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Match engine /match/find failed", { status: res.status, body: text });
    throw new Error("Match engine error");
  }

  return res.json();
};

export const getMatchResultService = async (requestId: string) => {
  const res = await fetch(`${MATCH_ENGINE_URL}/match/result/${encodeURIComponent(requestId)}`, {
    headers: {
      "x-internal-api-key": config.internalApiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("Match engine /match/result failed", { status: res.status, body: text });
    throw new Error("Match engine error");
  }

  return res.json();
};
