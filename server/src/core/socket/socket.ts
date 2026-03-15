import { Server } from "socket.io";
import { WEB_CLIENT_HOST } from "@/shared/constants";
import { auth } from "../auth/auth";
import { createAdapter } from "@socket.io/redis-adapter";
import { getPubSubClients } from "../redis";
import logger from "@/core/logging";
import eventEmitter from "@/core/events";
import { resolveClientIp } from "./utils";

declare module "socket.io" {
    interface Socket {
        userId?: string;
        user?: any;
        sessionId?: string;
        ip?: string;
    }
}

let io: Server | null = null;

const initSocket = () => {
    io = new Server({
        cors: {
            origin: WEB_CLIENT_HOST,
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 25000,
        pingInterval: 20000,
    });

    io.on('connection', (socket) => {
        logger.info(`New client connected: ${socket.id}`);

        const userId = socket.userId;
        const ip = socket.ip ?? "unknown_ip";

        if (!userId || typeof userId !== 'string' || userId.trim() === '') {
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

        // FIRES ON EVERY PING/PONG CYCLE (EVERY 20 SECONDS BASED ON pingInterval).
        // EMITS A HEARTBEAT EVENT SO UserEventListeners CAN REFRESH THE REDIS TTL
        // AND PREVENT ACTIVE USERS FROM BEING MARKED STALE AFTER 3 MINUTES.
        socket.conn.on("heartbeat", () => {
            eventEmitter.emit("user:heartbeat", {
                userId,
                socketId: socket.id,
            });
        });

        socket.on('disconnect', (reason) => {
            logger.info(`Client disconnected: ${socket.id}. Reason: ${reason}`);
            eventEmitter.emit("user:disconnected", {
                userId,
                socketId: socket.id,
                ip,
                timestamp: new Date(),
            });
        });
    });

    io.use(async (socket, next) => {
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

            logger.info(`Authenticated user ${session.user.id} (session: ${session.session.id}) connected with socket ${socket.id} from ip ${socket.ip}`);
            next();

        } catch (error: any) {
            logger.error(`Authentication failed for socket ${socket.id}: ${error}`)

            if (error && error.message?.includes('session') || error.message?.includes('expired')) {
                return next(new Error("Session expired or invalid"));
            }

            return next(new Error("Authentication failed"));
        }
    });

    return io;
}

const getSocket = () => {
    if (!io) {
        logger.error("[Socket Service] Socket.io not initialized! Call initSocket first.");
        throw new Error("Socket.io not initialized! Call initSocket first.");
    }
    return io;
};

/** EMIT TO ALL SOCKETS FOR A USER (ALL TABS/DEVICES). USES ROOM user:{userId}. */
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

export {
    initSocket,
    getSocket,
    setupSocketAdapter,
}