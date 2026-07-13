import type { Context } from "hono";
import { voiceIqTapService } from "@/modules/voiceiq/voiceiq-tap.service";

export async function handleVoiceIQTap(c: Context): Promise<Response> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false as const, error: "invalid_json" }, 400);
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const roomId = typeof rec.roomId === "string" ? rec.roomId : "";
  const voiceiqIp = typeof rec.voiceiqIp === "string" ? rec.voiceiqIp : "";
  const voiceiqPort = typeof rec.voiceiqPort === "number" ? rec.voiceiqPort : 0;
  const sessionId = typeof rec.sessionId === "string" ? rec.sessionId : undefined;

  if (!roomId || !voiceiqIp || !voiceiqPort) {
    return c.json(
      { ok: false as const, error: "roomId, voiceiqIp, voiceiqPort are required" },
      400,
    );
  }

  const result = await voiceIqTapService.createTap({
    roomId,
    voiceiqIp,
    voiceiqPort,
    sessionId,
  });

  if (!result.ok) {
    if (result.error === "wrong_instance") {
      return c.json(
        {
          ok: false as const,
          error: "wrong_instance",
          ownerInstanceId: result.ownerInstanceId,
        },
        409,
      );
    }
    if (result.error === "plain_transport_failed") {
      return c.json({ ok: false as const, error: result.error }, 500);
    }
    if (result.error === "transport_connect_failed") {
      return c.json({ ok: false as const, error: result.error }, 500);
    }
    return c.json({ ok: false as const, error: result.error }, 500);
  }

  return c.json({
    ok: true as const,
    tapId: result.tapId,
    rtcServiceIp: result.rtcServiceIp,
    rtcServicePort: result.rtcServicePort,
    consumers: result.consumers,
    sessionId: result.sessionId,
  });
}

export async function handleVoiceIQTapRelease(c: Context): Promise<Response> {
  const tapId = c.req.param("tapId");
  if (!tapId) {
    return c.json({ ok: false as const, error: "missing_tap_id" }, 400);
  }
  const released = voiceIqTapService.releaseTap(tapId);

  if (!released.ok) {
    return c.json({ ok: false as const, error: released.error }, 404);
  }

  return c.json({ ok: true as const });
}
