import logger from "@/core/logging";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";

import { isDbRoomSessionClosed } from "../lib/room-expiry";
import { roomsRepository } from "../repositories/rooms.repository";
import { runLiveCircleAfterMarkLive } from "./live-circle-after-mark-live.service";

/**
 * Room lifecycle — implemented in phases:
 *
 * **Step 1 (this module):** Lazy auto-start — no cron. On join / RTC token, if the circle is
 * still `scheduled`, not expired, `scheduledStartAt` has passed, and `shouldMeetingAutoStart` is
 * true, atomically promote to `live`, provision Redis, notify invitees (same as host “Start”).
 *
 * **Step 2:** `shouldHostStartMeeting` — Redis `lobbyGateActive`; non-host RTC blocked until host
 * `POST /room/:id/open-meeting`. Lazy auto-start (Step 1) does **not** run when host must start first.
 *
 * **Step 3:** `deleteCircleAfterCall` — last active participant `leave-circle-rtc` ends the live circle
 * immediately when the flag is on; when off, last leave only records `left_at` (circle stays live
 * until host **end circle for everyone** or `expires_at` / scheduled join grace). `POST /room/:id/host-end-circle`
 * (legacy: `host-end-delete-after-call`) ends the session for everyone.
 */
export async function maybeAutoStartScheduledCircleFromDb(roomId: string): Promise<void> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") return;
  if (room.status !== "scheduled") return;
  if (isDbRoomSessionClosed(room)) return;

  const opts = mergeRoomAdvancedOptions(room.advancedOptions);
  if (opts.shouldHostStartMeeting) return;
  if (!opts.shouldMeetingAutoStart) return;

  if (!room.scheduledStartAt) return;

  const now = new Date();
  if (now.getTime() < room.scheduledStartAt.getTime()) return;

  const row = await roomsRepository.markRoomLive(roomId, now);
  if (!row) return;

  await runLiveCircleAfterMarkLive({
    roomId: row.id,
    hostUserId: room.hostUserId,
    roomType: row.roomType,
    title: room.title,
    notifyInvitees: true,
    lobbyGateActive: false,
  });

  logger.info("Scheduled circle auto-started (lazy)", {
    roomId: row.id,
    scheduledStartAt: room.scheduledStartAt?.toISOString(),
  });
}
