import logger from "@/core/logging";
import config from "@/shared/config/config";
import { sweepDueRoomSessions } from "@/modules/rooms/services/session/sweep-due-room-sessions.service";

let sweepTimer: ReturnType<typeof setInterval> | null = null;
let sweepInFlight = false;

async function runSweepTick(): Promise<void> {
  if (sweepInFlight) return;
  sweepInFlight = true;
  try {
    await sweepDueRoomSessions();
  } catch (error) {
    logger.error("room_session_sweep_failed", { error });
  } finally {
    sweepInFlight = false;
  }
}

/** Starts periodic reconcile for past-due rooms. No-op when interval is 0. */
export function startRoomSessionSweepScheduler(): void {
  const intervalMs = config.roomSessionSweepIntervalMs;
  if (intervalMs <= 0) {
    logger.info("room_session_sweep_disabled");
    return;
  }

  if (sweepTimer) return;

  void runSweepTick();

  sweepTimer = setInterval(() => {
    void runSweepTick();
  }, intervalMs);

  logger.info("room_session_sweep_started", { intervalMs });
}

export function stopRoomSessionSweepScheduler(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
