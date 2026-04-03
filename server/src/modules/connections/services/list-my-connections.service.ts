import type { ConnectionsListFilter } from "../schemas/connections-list.query.schema";
import { userConnectionsRepository } from "../repositories/user-connections.repository";
import type { ListMyConnectionsResult } from "../types/connection-list.types";

export async function listMyConnectionsService(
  userId: string,
  filter: ConnectionsListFilter,
): Promise<ListMyConnectionsResult> {
  const rows = await userConnectionsRepository.findManyWithPeersForList(
    userId,
    filter,
  );

  const items = rows.map((row) => {
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

  return { items };
}
