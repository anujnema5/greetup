import type { Server, Socket } from "socket.io";
import { jwtVerify } from "jose";
import { logger } from "@/core/logging";
import { isRoomSessionType, type RoomSessionType } from "@/shared/types/room-session";

function getSecret(): Uint8Array {
  const raw = process.env.RTC_JWT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("RTC_JWT_SECRET is missing or too short (min 16 chars)");
  }
  return new TextEncoder().encode(raw);
}

function extractToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as { token?: unknown } | undefined;
  if (auth && typeof auth.token === "string" && auth.token.length > 0) {
    return auth.token;
  }
  const q = socket.handshake.query?.token;
  if (typeof q === "string" && q.length > 0) return q;
  if (Array.isArray(q) && typeof q[0] === "string") return q[0];
  return null;
}

export function registerRtcSocketAuth(io: Server): void {
  io.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        logger.warn("RTC socket auth: missing token", { socketId: socket.id });
        return next(new Error("Unauthorized"));
      }

      const secret = getSecret();
      const { payload } = await jwtVerify(token, secret);

      const userId = typeof payload.sub === "string" ? payload.sub : null;
      const roomId = typeof payload.roomId === "string" ? payload.roomId : null;
      const roomType = payload.roomType;

      if (!userId || !roomId) {
        logger.warn("RTC socket auth: invalid claims", { socketId: socket.id });
        return next(new Error("Unauthorized"));
      }

      if (!isRoomSessionType(roomType)) {
        logger.warn("RTC socket auth: unsupported roomType", { roomType });
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = userId;
      socket.data.roomId = roomId;
      socket.data.roomType = roomType;

      return next();
    } catch (err) {
      logger.warn("RTC socket auth: verify failed", { err: String(err) });
      return next(new Error("Unauthorized"));
    }
  });
}

declare module "socket.io" {
  interface SocketData {
    userId?: string;
    roomId?: string;
    roomType?: RoomSessionType;
  }
}
