import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { users } from "@/core/database/schema";

export type SessionUserIdentityRow = {
  name: string | null;
  displayName: string | null;
  phoneNumber: string | null;
};

export const sessionUserRepository = {
  async findIdentityByUserId(userId: string): Promise<SessionUserIdentityRow | null> {
    const identity = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, displayName: true, phoneNumber: true },
    });
    return identity ?? null;
  },
};
