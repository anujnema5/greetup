import config from "@/shared/config/config";
import logger from "@/core/logging";

const MATCH_ENGINE_URL = config.matchEngineUrl;
const MATCH_ENGINE_AUDIENCE = config.matchEngineAuthAudience ?? MATCH_ENGINE_URL;
const METADATA_IDENTITY_ENDPOINT =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const TOKEN_FALLBACK_TTL_MS = 5 * 60_000;

type CachedAudienceToken = {
  audience: string;
  token: string;
  expiresAtMs: number;
};

let cachedAudienceToken: CachedAudienceToken | null = null;

function isHttpsAudience(audience: string): boolean {
  return audience.startsWith("https://");
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
    };

    if (!parsed.exp || !Number.isFinite(parsed.exp)) {
      return null;
    }

    return parsed.exp * 1000;
  } catch {
    return null;
  }
}

function getCachedTokenForAudience(audience: string): string | null {
  const now = Date.now();
  if (
    cachedAudienceToken &&
    cachedAudienceToken.audience === audience &&
    now < cachedAudienceToken.expiresAtMs - TOKEN_REFRESH_BUFFER_MS
  ) {
    return cachedAudienceToken.token;
  }
  return null;
}

function buildMetadataIdentityUrl(audience: string): string {
  const tokenUrl = new URL(METADATA_IDENTITY_ENDPOINT);
  tokenUrl.searchParams.set("audience", audience);
  tokenUrl.searchParams.set("format", "full");
  return tokenUrl.toString();
}

async function requestCloudRunIdToken(audience: string): Promise<string | null> {
  const metadataUrl = buildMetadataIdentityUrl(audience);

  const response = await fetch(metadataUrl, {
    headers: { "Metadata-Flavor": "Google" },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn("Failed to fetch Cloud Run identity token for match engine", {
      status: response.status,
      body,
    });
    return null;
  }

  const token = (await response.text()).trim();
  if (!token) {
    logger.warn("Cloud Run identity token for match engine was empty");
    return null;
  }

  return token;
}

function cacheToken(audience: string, token: string): void {
  cachedAudienceToken = {
    audience,
    token,
    expiresAtMs: decodeJwtExpiryMs(token) ?? Date.now() + TOKEN_FALLBACK_TTL_MS,
  };
}

async function getCloudRunIdToken(audience: string): Promise<string | null> {
  if (!isHttpsAudience(audience)) {
    return null;
  }

  const cachedToken = getCachedTokenForAudience(audience);
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const token = await requestCloudRunIdToken(audience);
    if (!token) {
      return null;
    }
    cacheToken(audience, token);
    return token;
  } catch (error) {
    logger.warn("Unable to fetch Cloud Run identity token for match engine", { error });
    return null;
  }
}

async function buildMatchEngineHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-internal-api-key": config.internalApiKey,
  };

  const idToken = await getCloudRunIdToken(MATCH_ENGINE_AUDIENCE);
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  return headers;
}

export async function matchEngineRequest(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${MATCH_ENGINE_URL}${path}`, {
    method,
    headers: await buildMatchEngineHeaders(),
    body: body ? JSON.stringify(body) : undefined,
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
