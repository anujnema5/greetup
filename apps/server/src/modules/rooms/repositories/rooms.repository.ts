import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/core/database";
import { rooms, users } from "@/core/database/schema";

export const roomsRepository = {
  async findUserDisplayLabel(userId: string): Promise<string> {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { displayName: true, name: true },
    });
    const displayName = row?.displayName?.trim();
    if (displayName) return displayName;
    const name = row?.name?.trim();
    return name || "Member";
  },

  async findRoomById(roomId: string) {
    return db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
  },

  async findRoomTitlesByIds(roomIds: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const unique = [...new Set(roomIds.filter((id) => id.length > 0))];
    if (unique.length === 0) return out;
    const titleRows = await db
      .select({ id: rooms.id, title: rooms.title })
      .from(rooms)
      .where(inArray(rooms.id, unique));
    for (const r of titleRows) {
      out.set(r.id, r.title);
    }
    return out;
  },

  async updateLiveRoomTitle(roomId: string, title: string) {
    const [row] = await db
      .update(rooms)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(rooms.id, roomId), eq(rooms.status, "live")))
      .returning({ id: rooms.id });
    return row ?? null;
  },
};
