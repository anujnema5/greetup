import { env } from "@/config/env";

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
    if (env.roomServiceMode === "mock" || !env.roomServiceUrl) {
      return {
        ok: true,
        roomId: `mock-room:${pairIdFor(input.requesterId, input.peerUserId)}:${input.attemptId}`,
      };
    }

    const requestBody = {
      attemptId: input.attemptId,
      pairId: pairIdFor(input.requesterId, input.peerUserId),
      users: [input.requesterId, input.peerUserId],
    };

    try {
      const response = await withTimeout(
        fetch(`${env.roomServiceUrl}/rooms/match`, {
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
        return { ok: false, reason: `room_service_http_${response.status}` };
      }

      const payload = (await response.json()) as { roomId?: unknown };
      if (typeof payload.roomId !== "string" || payload.roomId.length === 0) {
        return { ok: false, reason: "room_service_invalid_payload" };
      }

      return { ok: true, roomId: payload.roomId };
    } catch {
      return { ok: false, reason: "room_create_timeout_or_network" };
    }
  }
}
