import { and, eq, ilike, isNotNull, ne, notInArray, or, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { userBlocks, users } from "@/core/database/schema";
import { escapeIlikePattern } from "@/shared/sql/ilike-escape";

export type SearchUserHit = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
};

async function loadBlockedPeerIds(viewerId: string): Promise<string[]> {
  const [outgoing, incoming] = await Promise.all([
    db
      .select({ id: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, viewerId)),
    db
      .select({ id: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, viewerId)),
  ]);
  const set = new Set<string>();
  for (const r of outgoing) set.add(r.id);
  for (const r of incoming) set.add(r.id);
  return [...set];
}

export async function searchUsersService(
  viewerId: string,
  q: string,
  limit: number,
): Promise<{ items: SearchUserHit[] }> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) {
    return { items: [] };
  }

  const pattern = `%${escapeIlikePattern(term)}%`;
  const prefixPattern = `${escapeIlikePattern(term)}%`;
  const blocked = await loadBlockedPeerIds(viewerId);

  const conditions = [
    eq(users.isBanned, "no"),
    isNotNull(users.username),
    ne(users.id, viewerId),
    or(
      ilike(users.username, pattern),
      ilike(users.displayName, pattern),
      ilike(users.name, pattern),
    ),
  ];
  if (blocked.length > 0) {
    conditions.push(notInArray(users.id, blocked));
  }

  const base = and(...conditions);

  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(base)
    .orderBy(
      sql`CASE WHEN ${users.username} ILIKE ${prefixPattern} ESCAPE '\\' THEN 0 ELSE 1 END`,
      users.username,
    )
    .limit(limit);

  return {
    items: rows
      .filter((r): r is SearchUserHit & { username: string } => r.username != null)
      .map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        image: r.image,
      })),
  };
}
