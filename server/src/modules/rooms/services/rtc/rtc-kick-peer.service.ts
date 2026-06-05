import logger from "@/core/logging";
import config from "@/shared/config/config";

/** Best-effort: tells rtc-service to evict one peer from the SFU room and disconnect their socket. */
export async function notifyRtcServiceKickPeer(
  roomId: string,
  targetUserId: string,
): Promise<void> {
  const base = config.rtcServiceBaseUrl;
  if (!base) {
    logger.warn("notifyRtcServiceKickPeer: RTC_SERVICE_URL empty", { roomId, targetUserId });
    return;
  }
  const url = `${base}/internal/webhook/kick-peer`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": config.internalApiKey ?? "",
      },
      body: JSON.stringify({ roomId, targetUserId }),
    });
    if (!res.ok) {
      logger.warn("notifyRtcServiceKickPeer: non-OK response", {
        roomId,
        targetUserId,
        status: res.status,
      });
    }
  } catch (err) {
    logger.warn("notifyRtcServiceKickPeer: fetch failed", {
      roomId,
      targetUserId,
      err: String(err),
    });
  }
}
