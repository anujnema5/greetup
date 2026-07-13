import {
  Server as BunSocketEngine,
  type ServerOptions as BunSocketEngineOptions,
} from "@socket.io/bun-engine";

import { initSocket, setupSocketAdapter } from "./socket";
import { SOCKET_IO_PATH, socketIoServerOptions } from "./socket-config";

/**
 * Socket.IO on Bun uses `@socket.io/bun-engine` + `io.bind(engine)` (see
 * https://socket.io/docs/v4/server-installation/#usage-with-bun ).
 *
 * When Hono shares the same port, `fetch` must send `/socket.io` to the engine
 * and everything else to `app.fetch` — same idea as the Hono + Bun example in those docs.
 */
export function wireBunSocketIo(): BunSocketEngine {
  const engine = new BunSocketEngine({
    path: SOCKET_IO_PATH,
    pingTimeout: socketIoServerOptions.pingTimeout ?? 20_000,
    pingInterval: socketIoServerOptions.pingInterval ?? 25_000,
    cors: socketIoServerOptions.cors as BunSocketEngineOptions["cors"],
  });
  initSocket().bind(engine);
  setupSocketAdapter();
  return engine;
}

/** Normalize `/socket.io/` → `/socket.io` so the engine path check matches. */
export function isSocketIoRequestPath(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return p === SOCKET_IO_PATH;
}
