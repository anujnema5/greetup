import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

import eventEmitter from "@/core/events";
import logger from "@/core/logging";
import { auth } from "@/core/auth/auth";
import { getPubSubClients } from "../redis";
import { resolveClientIp } from "./utils";
import { socketIoServerOptions } from "./socket-config";

declare module "socket.io" {
  interface Socket {
    userId?: string;
    user?: unknown;
    sessionId?: string;
    ip?: string;
  }
}

let io: Server | null = null;

const registerConnectionHandlers = (server: Server) => {
  server.on("connection", (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    const userId = socket.userId;
    const ip = socket.ip ?? "unknown_ip";

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      logger.warn(`[Socket] Connection rejected: no valid userId for socket ${socket.id}`);
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);

    eventEmitter.emit("user:connected", {
      userId,
      socketId: socket.id,
      ip,
      timestamp: new Date(),
      userAgent: socket.handshake.headers["user-agent"],
    });

    socket.conn.on("heartbeat", () => {
      eventEmitter.emit("user:heartbeat", {
        userId,
        socketId: socket.id,
      });
    });

    socket.on("disconnect", (reason) => {
      logger.info(`Client disconnected: ${socket.id}. Reason: ${reason}`);
      eventEmitter.emit("user:disconnected", {
        userId,
        socketId: socket.id,
        ip,
        timestamp: new Date(),
      });
    });
  });
};

const registerAuthMiddleware = (server: Server) => {
  server.use(async (socket, next) => {
    try {
      const headers = socket.handshake.headers;

      if (!headers.cookie) {
        logger.warn(`Connection attempt without cookies from ${socket.id}`);
        return next(new Error("No cookies provided"));
      }

      logger.info(`Authenticating socket ${socket.id} with cookies: ${headers.cookie}`);
      const session = await auth.api.getSession({ headers: headers as any });

      if (!session) {
        logger.warn(`No valid session found for socket ${socket.id}`);
        return next(new Error("No valid session"));
      }

      if (!session.user) {
        logger.warn(`Session exists but no user found for socket ${socket.id}`);
        return next(new Error("Invalid session - no user"));
      }

      socket.userId = session.user.id;
      socket.user = session.user;
      socket.sessionId = session.session.id;
      socket.ip = resolveClientIp(socket);

      logger.info(
        `Authenticated user ${session.user.id} (session: ${session.session.id}) connected with socket ${socket.id} from ip ${socket.ip}`
      );
      next();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Authentication failed for socket ${socket.id}: ${err.message}`);

      const msg = err.message ?? "";
      if (msg.includes("session") || msg.includes("expired")) {
        return next(new Error("Session expired or invalid"));
      }

      return next(new Error("Authentication failed"));
    }
  });
};

const initSocket = () => {
  io = new Server(socketIoServerOptions);
  registerConnectionHandlers(io);
  registerAuthMiddleware(io);
  return io;
};

const getSocket = () => {
  if (!io) {
    logger.error("[Socket Service] Socket.io not initialized! Call initSocket first.");
    throw new Error("Socket.io not initialized! Call initSocket first.");
  }
  return io;
};

const emitToUser = (userId: string, event: string, data?: unknown) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

const setupSocketAdapter = () => {
  const { pub, sub } = getPubSubClients();
  if (!io) {
    logger.error("[Socket Service] Cannot setup adapter, Socket.io not initialized!");
    throw new Error("Socket.io not initialized!");
  }
  io.adapter(createAdapter(pub, sub));
  logger.info("[Socket Service] Redis adapter setup complete with pub/sub clients.");
};

export { initSocket, getSocket, setupSocketAdapter, emitToUser };
