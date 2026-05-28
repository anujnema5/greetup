import { userConnectionsRepository } from "../repositories/user-connections.repository";
import { notifyConnectionRequestAccepted } from "../notifications";
import { emitConnectionUpdated } from "../socket/emit-connection-updated";

export type RespondIncomingResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" };

type IncomingRespondRow = NonNullable<
  Awaited<ReturnType<typeof userConnectionsRepository.findByIdForIncomingRespond>>
>;

function gateAddresseePending(
  row: IncomingRespondRow | null | undefined,
  viewerId: string,
): RespondIncomingResult {
  if (!row) {
    return { ok: false, error: "NOT_FOUND" };
  }
  if (row.addresseeId !== viewerId) {
    return { ok: false, error: "FORBIDDEN" };
  }
  if (row.status !== "pending") {
    return { ok: false, error: "INVALID_STATE" };
  }
  return { ok: true };
}

export async function acceptIncomingConnectionService(
  viewerId: string,
  connectionId: string,
): Promise<RespondIncomingResult> {
  const row = await userConnectionsRepository.findByIdForIncomingRespond(connectionId);
  const gate = gateAddresseePending(row, viewerId);
  if (!gate.ok) {
    return gate;
  }
  await userConnectionsRepository.updateStatusById(connectionId, "accepted");
  if (row?.requesterId) {
    await notifyConnectionRequestAccepted({
      recipientUserId: row.requesterId,
      actorUserId: viewerId,
      connectionId,
    });
    emitConnectionUpdated(row.requesterId, {
      peerUserId: viewerId,
      connectionId,
      status: "accepted",
    });
  }
  return { ok: true };
}

export async function rejectIncomingConnectionService(
  viewerId: string,
  connectionId: string,
): Promise<RespondIncomingResult> {
  const row = await userConnectionsRepository.findByIdForIncomingRespond(connectionId);
  const gate = gateAddresseePending(row, viewerId);
  if (!gate.ok) {
    return gate;
  }
  await userConnectionsRepository.updateStatusById(connectionId, "rejected");
  if (row?.requesterId) {
    emitConnectionUpdated(row.requesterId, {
      peerUserId: viewerId,
      connectionId,
      status: "rejected",
    });
  }
  return { ok: true };
}
