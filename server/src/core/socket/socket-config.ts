import type { ServerOptions } from "socket.io";

import { WEB_CLIENT_HOST } from "@/shared/constants";

/** Path segment for Engine.IO + Socket.IO (must match `url.pathname`, no trailing slash). */
export const SOCKET_IO_PATH = "/socket.io";

/** Socket.IO server options shared by `initSocket`. */
export const socketIoServerOptions: Partial<ServerOptions> = {
  cors: {
    origin: WEB_CLIENT_HOST,
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 25_000,
  pingInterval: 20_000,
};
