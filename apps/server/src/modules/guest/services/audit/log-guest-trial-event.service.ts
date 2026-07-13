import {
  GUEST_TRIAL_EVENT_TYPES,
  type GuestTrialEventType,
} from "@/core/database/schema";
import logger from "@/core/logging";

import { guestTrialEventsRepository } from "../../repositories/guest-trial-events.repository";
import type { LogGuestTrialEventInput } from "../../types/guest-trial.types";

const EVENT_TYPE_SET = new Set<string>(GUEST_TRIAL_EVENT_TYPES);

function assertEventType(eventType: string): asserts eventType is GuestTrialEventType {
  if (!EVENT_TYPE_SET.has(eventType)) {
    throw new Error(`Invalid guest trial event type: ${eventType}`);
  }
}

export async function logGuestTrialEvent(input: LogGuestTrialEventInput) {
  assertEventType(input.eventType);

  const row = await guestTrialEventsRepository.insert({
    guestUserId: input.guestUserId,
    eventType: input.eventType,
    deviceHash: input.deviceHash ?? null,
    ipHash: input.ipHash ?? null,
    metadata: input.metadata ?? {},
  });

  logger.info("guest_trial_event", {
    guestUserId: input.guestUserId,
    eventType: input.eventType,
    eventId: row.id,
  });

  return row;
}
