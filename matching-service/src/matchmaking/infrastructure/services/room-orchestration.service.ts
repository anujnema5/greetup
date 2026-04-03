import { env } from "@/config/env";
import { logger } from "@/core/logger";

type CreateRoomInput = {
  attemptId: string;
  requesterId: string;
  peerUserId: string;
  timeoutMs: number;
};

type CreateRoomResult =
  | { ok: true; roomId: string }
  | { ok: false; reason: string };

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("room_create_timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const pairIdFor = (left: string, right: string): string => {
  return left <= right ? `${left}:${right}` : `${right}:${left}`;
};

export class RoomOrchestrationService {
  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    const pairId = pairIdFor(input.requesterId, input.peerUserId);

    logger.debug("[RoomOrchestration] createRoom called", {
      attemptId: input.attemptId,
      pairId,
      requesterId: input.requesterId,
      peerUserId: input.peerUserId,
      timeoutMs: input.timeoutMs,
      mode: env.roomServiceMode,
      hasRoomServiceUrl: Boolean(env.roomServiceUrl),
    });

    if (env.roomServiceMode === "mock" || !env.roomServiceUrl) {
      const roomId = `mock-room:${pairId}:${input.attemptId}`;
      logger.info("[RoomOrchestration] mock room id (no HTTP)", { attemptId: input.attemptId, pairId, roomId });
      return {
        ok: true,
        roomId,
      };
    }

    const requestBody = {
      attemptId: input.attemptId,
      pairId,
      users: [input.requesterId, input.peerUserId],
    };

    const url = `${env.roomServiceUrl}/rooms/match`;
    logger.debug("[RoomOrchestration] POST room service", {
      attemptId: input.attemptId,
      pairId,
      url,
      timeoutMs: input.timeoutMs,
    });

    try {
      const response = await withTimeout(
        fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-api-key": env.internalApiKey,
          },
          body: JSON.stringify(requestBody),
        }),
        input.timeoutMs,
      );

      if (!response.ok) {
        const bodySnippet = await response.text().catch(() => "");
        logger.warn("[RoomOrchestration] room service returned non-OK", {
          attemptId: input.attemptId,
          pairId,
          status: response.status,
          statusText: response.statusText,
          bodyPreview: bodySnippet.slice(0, 500),
        });
        return { ok: false, reason: `room_service_http_${response.status}` };
      }

      const payload = (await response.json()) as {
        roomId?: unknown;
        data?: { roomId?: unknown };
      };
      const roomIdRaw =
        typeof payload.roomId === "string" && payload.roomId.length > 0
          ? payload.roomId
          : typeof payload.data?.roomId === "string" && payload.data.roomId.length > 0
            ? payload.data.roomId
            : undefined;
      if (roomIdRaw === undefined) {
        logger.warn("[RoomOrchestration] room service response missing roomId", {
          attemptId: input.attemptId,
          pairId,
          payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : [],
        });
        return { ok: false, reason: "room_service_invalid_payload" };
      }

      logger.info("[RoomOrchestration] room created via HTTP", {
        attemptId: input.attemptId,
        pairId,
        roomId: roomIdRaw,
      });

      return { ok: true, roomId: roomIdRaw };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isTimeout = message.includes("room_create_timeout");
      logger.warn("[RoomOrchestration] createRoom failed", {
        attemptId: input.attemptId,
        pairId,
        reason: isTimeout ? "timeout" : "network_or_parse",
        errorMessage: message,
      });
      return { ok: false, reason: "room_create_timeout_or_network" };
    }
  }
}
