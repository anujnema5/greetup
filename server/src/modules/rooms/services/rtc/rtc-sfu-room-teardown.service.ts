import logger from "@/core/logging";
import config from "@/shared/config/config";

/**
 * Best-effort: tells rtc-service to evict peers, release VoiceIQ taps, close the mediasoup Router,
 * and clear `rtc:room:*` Redis keys for this replica.
 *
 * **Callers:** host “end circle for everyone”, and when the last participant leaves a live circle
 * (so rejoin can claim a fresh SFU on the current rtc replica). Also clears stale `rtc:room:*` keys
 * when the webhook hits a different process than the recorded owner.
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
