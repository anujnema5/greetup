import type { Context } from "hono";

import { getInternalPeers } from "@/modules/rtc/internal/global-peer-session";
import { isRoomSessionType } from "@/shared/types/room-session";

export const handleRoomSfuTeardown = async (c: Context): Promise<Response> => {
  const peers = getInternalPeers();
  if (!peers) {
    return c.json({ ok: false as const, error: "service_unavailable" }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false as const, error: "invalid_json" }, 400);
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const roomId = typeof rec.roomId === "string" ? rec.roomId : "";
  if (!roomId) {
    return c.json({ ok: false as const, error: "validation" }, 400);
  }

  const result = await peers.forceTeardownMediasoupRoom(roomId);
  return c.json(result);
};

export const handleRoomRoomType = async (c: Context): Promise<Response> => {
  const peers = getInternalPeers();
  if (!peers) {
    return c.json({ ok: false as const, error: "service_unavailable" }, 503);
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
};
