import { and, eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  guestTrialEvents,
  type GuestTrialEventType,
  type NewGuestTrialEvent,
} from "@/core/database/schema";

export const guestTrialEventsRepository = {
  async insert(event: NewGuestTrialEvent) {
    const [row] = await db.insert(guestTrialEvents).values(event).returning();
    return row;
  },

  async hasEvent(guestUserId: string, eventType: GuestTrialEventType): Promise<boolean> {
    const row = await db.query.guestTrialEvents.findFirst({
      where: and(
        eq(guestTrialEvents.guestUserId, guestUserId),
        eq(guestTrialEvents.eventType, eventType),
      ),
      columns: { id: true },
    });
    return row != null;
  },
};
