import type { RoomAdvancedOptions } from "@/core/database/schema";
import type { RoomSessionType } from "@/shared/types/room-session";

/** Aligns with Postgres `rooms.status`. */
export type RoomDbStatus = "scheduled" | "live" | "ended" | "cancelled";

/** Scheduled listing / calendar window inputs (no live session cap). */
export type RoomExpiryInputs = {
  status: RoomDbStatus;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  advancedOptions: RoomAdvancedOptions | null | undefined;
};

/** Live session cap inputs (`started_at` + room type). */
export type RoomLiveSessionInputs = RoomExpiryInputs & {
  roomType: RoomSessionType;
  startedAt: Date | null;
};

/** Repository-facing: scheduled row vs live row with session deadline. */
export type RoomExpirySource = {
  status: RoomDbStatus;
  roomType: RoomSessionType;
  startedAt: Date | null;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  advancedOptions: RoomAdvancedOptions | null | undefined;
};

export type RoomExpiryFields = {
  expiresAt: Date | null;
  isExpired: boolean;
};

export type ScheduledCalendarEndInput = {
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  advancedOptions: RoomAdvancedOptions | null | undefined;
};

/** Direct → circle: extend `expires_at` without shortening. */
export type CircleUpgradeExpiryParams = {
  currentExpiresAt: Date | null;
  liveStartedAt: Date;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  advancedOptions: RoomAdvancedOptions | null | undefined;
  now?: Date;
};

/** Minimal DB row for {@link isDbRoomSessionClosed}. */
export type DbRoomSessionRow = {
  status: RoomDbStatus;
  expiresAt: Date | null;
  isExpired: boolean;
};
