import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { problemReports, rooms, type NewProblemReport, type ProblemReport } from "@/core/database/schema";

export const problemReportsRepository = {
  async create(values: NewProblemReport): Promise<ProblemReport> {
    const [row] = await db.insert(problemReports).values(values).returning();
    return row;
  },

  async roomExists(roomId: string): Promise<boolean> {
    const row = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);
    return row.length > 0;
  },
};
