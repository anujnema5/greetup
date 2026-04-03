import type { ListConnectionsQuery } from "../schemas/connections-list.query.schema";
import { userConnectionsRepository } from "../repositories/user-connections.repository";
import type { ConnectionListItem, ListMyConnectionsResult } from "../types/connection-list.types";

type Row = Awaited<
  ReturnType<typeof userConnectionsRepository.findManyWithPeersForList>
>[number];

function mapRowsToItems(userId: string, rows: Row[]): ConnectionListItem[] {
  return rows.map((row) => {
    const imRequester = row.requesterId === userId;
    const peerUser = imRequester ? row.addressee : row.requester;
    const direction: "incoming" | "outgoing" | null =
      row.status === "pending" ? (imRequester ? "outgoing" : "incoming") : null;

    return {
      connectionId: row.id,
      status: row.status,
      direction,
      peer: {
        userId: peerUser.id,
        displayName: peerUser.displayName ?? null,
        name: peerUser.name,
        image: peerUser.image ?? null,
        profileId: peerUser.profile?.id ?? null,
      },
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function listMyConnectionsService(
  userId: string,
  query: ListConnectionsQuery,
): Promise<ListMyConnectionsResult> {
  const { filter, page, limit, q } = query;

  if (limit !== undefined) {
    const { rows, hasMore } = await userConnectionsRepository.findManyWithPeersForListPaged(
      userId,
      filter,
      { page, limit, q: q.trim() || undefined },
    );
    return {
      items: mapRowsToItems(userId, rows as Row[]),
      page,
      limit,
      hasMore,
    };
  }

  const rows = await userConnectionsRepository.findManyWithPeersForList(userId, filter);
  return { items: mapRowsToItems(userId, rows as Row[]) };
}
