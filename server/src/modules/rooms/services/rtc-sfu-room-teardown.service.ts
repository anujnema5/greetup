import logger from "@/core/logging";
import config from "@/shared/config/config";

/**
 * Best-effort: tells rtc-service to evict peers, release VoiceIQ taps, close the mediasoup Router,
 * and clear `rtc:room:*` Redis keys for this replica.
 *
 * **Intended caller:** host “end circle for everyone” only (`hostEndCircleForEveryoneService`),
 * after `deleteSessionRoomRedis(roomId)` so the scheduled slot can stay in Postgres without a live SFU.
 */
export async function notifyRtcServiceSfuRoomTeardown(roomId: string): Promise<void> {
  const base = config.rtcServiceBaseUrl;
  if (!base) {
    logger.warn("notifyRtcServiceSfuRoomTeardown: RTC_SERVICE_URL empty", { roomId });
    return;
  }
  const url = `${base}/internal/webhook/room-sfu-teardown`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": config.internalApiKey ?? "",
      },
      body: JSON.stringify({ roomId }),
    });
    if (!res.ok) {
      logger.warn("notifyRtcServiceSfuRoomTeardown: non-OK response", { roomId, status: res.status });
    }
  } catch (err) {
    logger.warn("notifyRtcServiceSfuRoomTeardown: fetch failed", { roomId, err: String(err) });
  }
}
