import { Hono } from "hono";
import { env } from "@/config/env";
import type { PeerSessionService } from "@/peers/peer.service";
import { isRoomSessionType } from "@/types/room-session";

/** POST `/internal/room-room-type` — sync `socket.data.roomType` for in-place 1:1 → circle. */
export function createInternalRoomTypeRouter(peers: PeerSessionService): Hono {
  const r = new Hono();

  r.post("/room-room-type", async (c) => {
    const key = c.req.header("x-internal-key") ?? "";
    if (env.internalApiKey && key !== env.internalApiKey) {
      return c.json({ ok: false as const, error: "unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ ok: false as const, error: "invalid_json" }, 400);
    }

    const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const roomId = typeof rec.roomId === "string" ? rec.roomId : "";
    const roomType = isRoomSessionType(rec.roomType) ? rec.roomType : null;
    if (!roomId || !roomType) {
      return c.json({ ok: false as const, error: "validation" }, 400);
    }

    const { updated } = peers.setRoomTypeForRoomPeers(roomId, roomType);
    return c.json({ ok: true as const, updated });
  });

  return r;
}
