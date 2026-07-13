import { and, eq, ilike, isNotNull, ne, notInArray, or, sql } from "drizzle-orm";

import logger from "@/core/logging";
import { db } from "@/core/database";
import { users } from "@/core/database/schema";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { escapeIlikePattern } from "@/shared/sql/ilike-escape";

export type SearchUserHit = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
};

async function loadBlockedPeerIds(viewerId: string): Promise<string[]> {
  return userBlocksRepository.listAllBlockedPeerIds(viewerId);
}

export async function searchUsersService(
  viewerId: string,
  q: string,
  limit: number,
): Promise<{ items: SearchUserHit[] }> {
  const term = q.trim().toLowerCase();
  if (term.length < 2) {
    logger.warn("user_search_rejected", { viewerId, reason: "query_too_short", queryLength: term.length });
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

  const items = rows
      .filter((r): r is SearchUserHit & { username: string } => r.username != null)
      .map((r) => ({
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        image: r.image,
      }));

  logger.debug("users_searched", { viewerId, queryLength: term.length, resultCount: items.length });
  return { items };
}
