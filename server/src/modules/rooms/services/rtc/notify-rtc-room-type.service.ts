import logger from "@/core/logging";
import config from "@/shared/config/config";
import type { RoomSessionType } from "@/shared/types/room-session";

/** Pushes updated `roomType` to rtc-service so existing Socket.IO sessions pick up space screen-share rules. */
export async function notifyRtcServiceRoomType(
  roomId: string,
  roomType: RoomSessionType,
): Promise<void> {
  const base = config.rtcServiceBaseUrl;
  if (!base) {
    logger.warn("notifyRtcServiceRoomType: RTC_SERVICE_URL empty");
    return;
  }
  const url = `${base}/internal/webhook/room-room-type`;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-internal-api-key": config.internalApiKey ?? "",
    };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ roomId, roomType }),
    });
    if (!res.ok) {
      logger.warn("notifyRtcServiceRoomType: non-OK response", { roomId, status: res.status });
    }
  } catch (err) {
    logger.warn("notifyRtcServiceRoomType: fetch failed", { roomId, err: String(err) });
  }
}
