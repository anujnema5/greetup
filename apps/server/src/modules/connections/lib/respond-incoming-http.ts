import type { RespondIncomingResult } from "../services/respond-incoming-connection.service";

type Failure = Extract<RespondIncomingResult, { ok: false }>["error"];

/**
 * Maps domain errors from accept/reject connection services to HTTP API fields.
 */
export function respondIncomingFailurePayload(error: Failure, action: "accept" | "reject") {
  switch (error) {
    case "NOT_FOUND":
      return {
        message: "Connection not found",
        statusCode: 404,
        code: "CONNECTION_NOT_FOUND",
      } as const;
    case "FORBIDDEN":
      return {
        message: "You cannot respond to this request",
        statusCode: 403,
        code: "FORBIDDEN",
      } as const;
    case "INVALID_STATE":
      return {
        message:
          action === "accept"
            ? "This request can no longer be accepted"
            : "This request can no longer be rejected",
        statusCode: 409,
        code: "INVALID_CONNECTION_STATE",
      } as const;
  }
}
