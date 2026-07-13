import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/core/database";
import { roomActivities } from "@/core/database/schema";

import { toSpaceActivityTagDto } from "@/modules/session-activities/activity-catalog.mapper";
import type { SpaceActivityTagDto, ValidatedActivitySelection } from "@/modules/session-activities/types";

type RoomActivityListRow = {
  roomId: string;
  detail: string | null;
  activity: {
    id: string;
    name: string;
    displayName: string;
    emoji: string | null;
  };
};

export const roomActivitiesRepository = {
  async replaceRoomActivities(
    roomId: string,
    selections: ValidatedActivitySelection[],
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(roomActivities).where(eq(roomActivities.roomId, roomId));
      if (selections.length === 0) return;
      await tx.insert(roomActivities).values(
        selections.map((row) => ({
          roomId,
          activityId: row.activityId,
          detail: row.detail,
          detailNormalized: row.detailNormalized,
          sortOrder: row.sortOrder,
        })),
      );
    });
  },

  async listByRoomId(roomId: string) {
    return db.query.roomActivities.findMany({
      where: eq(roomActivities.roomId, roomId),
      orderBy: [asc(roomActivities.sortOrder)],
      with: {
        activity: {
          columns: {
            id: true,
            name: true,
            displayName: true,
            emoji: true,
          },
        },
      },
      columns: {
        detail: true,
      },
    });
  },

  async listByRoomIds(roomIds: string[]) {
    if (roomIds.length === 0) return [];
    return db.query.roomActivities.findMany({
      where: inArray(roomActivities.roomId, roomIds),
      orderBy: [asc(roomActivities.roomId), asc(roomActivities.sortOrder)],
      with: {
        activity: {
          columns: {
            id: true,
            name: true,
            displayName: true,
            emoji: true,
          },
        },
      },
      columns: {
        roomId: true,
        detail: true,
      },
    });
  },

  groupByRoomId(rows: RoomActivityListRow[]): Map<string, SpaceActivityTagDto[]> {
    const map = new Map<string, SpaceActivityTagDto[]>();
    for (const row of rows) {
      const list = map.get(row.roomId) ?? [];
      list.push(toSpaceActivityTagDto(row));
      map.set(row.roomId, list);
    }
    return map;
  },
};
