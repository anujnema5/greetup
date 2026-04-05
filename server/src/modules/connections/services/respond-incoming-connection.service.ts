import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { userConnections } from "@/core/database/schema";

export type RespondIncomingResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" };

async function assertViewerIsAddresseeOfPendingRequest(
  connectionId: string,
  viewerId: string,
): Promise<RespondIncomingResult> {
  const row = await db.query.userConnections.findFirst({
    where: eq(userConnections.id, connectionId),
    columns: {
      id: true,
      addresseeId: true,
      status: true,
    },
  });
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

async function setConnectionStatus(
  connectionId: string,
  status: "accepted" | "rejected",
): Promise<void> {
  await db
    .update(userConnections)
    .set({ status, updatedAt: new Date() })
    .where(eq(userConnections.id, connectionId));
}

export async function acceptIncomingConnectionService(
  viewerId: string,
  connectionId: string,
): Promise<RespondIncomingResult> {
  const gate = await assertViewerIsAddresseeOfPendingRequest(connectionId, viewerId);
  if (!gate.ok) {
    return gate;
  }
  await setConnectionStatus(connectionId, "accepted");
  return { ok: true };
}

export async function rejectIncomingConnectionService(
  viewerId: string,
  connectionId: string,
): Promise<RespondIncomingResult> {
  const gate = await assertViewerIsAddresseeOfPendingRequest(connectionId, viewerId);
  if (!gate.ok) {
    return gate;
  }
  await setConnectionStatus(connectionId, "rejected");
  return { ok: true };
}
