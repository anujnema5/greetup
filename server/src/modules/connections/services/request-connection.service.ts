import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { userConnectionsRepository } from "../repositories/user-connections.repository";
import { notifyConnectionRequestReceived } from "../notifications";
import { emitConnectionUpdated } from "../socket/emit-connection-updated";

export type RequestConnectionResult =
  | { ok: true; status: "accepted" | "pending"; connectionId?: string }
  | { ok: false; error: "SELF" | "BLOCKED" | "ALREADY_CONNECTED" };

type BetweenRow = Awaited<
  ReturnType<typeof userConnectionsRepository.findAllBetween>
>[number];

function isStaleRow(row: BetweenRow): boolean {
  return row.status === "rejected" || row.status === "cancelled";
}

async function notifyRequestReceived(params: {
  recipientUserId: string;
  actorUserId: string;
  connectionId: string;
  dedupeSalt?: string;
}): Promise<void> {
  await notifyConnectionRequestReceived({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    connectionId: params.connectionId,
    ...(params.dedupeSalt !== undefined ? { dedupeSalt: params.dedupeSalt } : {}),
  });
}

/**
 * Creates or updates connection rows so the viewer has an outgoing pending request to
 * `targetUserId`. Handles two directed rows (withdraw + reject history) without
 * violating the (requester_id, addressee_id) unique index.
 */
export async function requestConnectionService(
  viewerId: string,
  targetUserId: string,
): Promise<RequestConnectionResult> {
  if (viewerId === targetUserId) {
    return { ok: false, error: "SELF" };
  }

  const blocked = await userBlocksRepository.isEitherBlocked(viewerId, targetUserId);
  if (blocked) {
    return { ok: false, error: "BLOCKED" };
  }

  const rows = await userConnectionsRepository.findAllBetween(viewerId, targetUserId);

  if (rows.some((r) => r.status === "accepted")) {
    return { ok: false, error: "ALREADY_CONNECTED" };
  }

  // --- Existing pending request (either direction) ---
  const pending = rows.find((r) => r.status === "pending");
  if (pending) {
    const theyRequestedViewer =
      pending.requesterId === targetUserId && pending.addresseeId === viewerId;
    if (theyRequestedViewer) {
      await userConnectionsRepository.markAcceptedById(pending.id);
      emitConnectionUpdated(targetUserId, {
        peerUserId: viewerId,
        connectionId: pending.id,
        status: "accepted",
      });
      return { ok: true, status: "accepted", connectionId: pending.id };
    }
    return { ok: true, status: "pending", connectionId: pending.id };
  }

  // --- No pending: reopen or merge stale rows, or insert ---
  const direct = rows.find((r) => r.requesterId === viewerId && r.addresseeId === targetUserId);
  const reverse = rows.find((r) => r.requesterId === targetUserId && r.addresseeId === viewerId);

  if (direct && isStaleRow(direct) && reverse && isStaleRow(reverse)) {
    await userConnectionsRepository.deleteById(reverse.id);
    await userConnectionsRepository.markPendingById(direct.id);
    await notifyRequestReceived({
      recipientUserId: targetUserId,
      actorUserId: viewerId,
      connectionId: direct.id,
      dedupeSalt: `merged-${Date.now()}`,
    });
    return { ok: true, status: "pending", connectionId: direct.id };
  }

  if (direct && isStaleRow(direct)) {
    await userConnectionsRepository.markPendingById(direct.id);
    await notifyRequestReceived({
      recipientUserId: targetUserId,
      actorUserId: viewerId,
      connectionId: direct.id,
      dedupeSalt: `retry-${Date.now()}`,
    });
    return { ok: true, status: "pending", connectionId: direct.id };
  }

  if (reverse && isStaleRow(reverse)) {
    await userConnectionsRepository.setAsPendingRequest({
      connectionId: reverse.id,
      requesterId: viewerId,
      addresseeId: targetUserId,
    });
    await notifyRequestReceived({
      recipientUserId: targetUserId,
      actorUserId: viewerId,
      connectionId: reverse.id,
      dedupeSalt: `retry-flip-${Date.now()}`,
    });
    return { ok: true, status: "pending", connectionId: reverse.id };
  }

  const inserted = await userConnectionsRepository.insertPendingRequest(viewerId, targetUserId);

  if (inserted?.id) {
    await notifyRequestReceived({
      recipientUserId: targetUserId,
      actorUserId: viewerId,
      connectionId: inserted.id,
    });
  }

  return { ok: true, status: "pending", connectionId: inserted?.id };
}
