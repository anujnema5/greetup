import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { userConnections } from "@/core/database/schema";
import { userBlocksRepository } from "@/modules/blocks/repositories/user-blocks.repository";
import { userConnectionsRepository } from "../repositories/user-connections.repository";

export type RequestConnectionResult =
  | { ok: true; status: "accepted" | "pending"; connectionId?: string }
  | { ok: false; error: "SELF" | "BLOCKED" | "ALREADY_CONNECTED" };

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

  const row = await userConnectionsRepository.findUndirected(viewerId, targetUserId);

  if (row?.status === "accepted") {
    return { ok: false, error: "ALREADY_CONNECTED" };
  }

  if (row?.status === "pending") {
    if (row.requesterId === targetUserId && row.addresseeId === viewerId) {
      await db
        .update(userConnections)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(userConnections.id, row.id));
      return { ok: true, status: "accepted", connectionId: row.id };
    }
    return { ok: true, status: "pending", connectionId: row.id };
  }

  if (row && (row.status === "rejected" || row.status === "cancelled")) {
    if (row.requesterId === viewerId) {
      await db
        .update(userConnections)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(userConnections.id, row.id));
      return { ok: true, status: "pending", connectionId: row.id };
    }
    const [inserted] = await db
      .insert(userConnections)
      .values({
        requesterId: viewerId,
        addresseeId: targetUserId,
        status: "pending",
      })
      .returning({ id: userConnections.id });
    return { ok: true, status: "pending", connectionId: inserted?.id };
  }

  const [inserted] = await db
    .insert(userConnections)
    .values({
      requesterId: viewerId,
      addresseeId: targetUserId,
      status: "pending",
    })
    .returning({ id: userConnections.id });

  return { ok: true, status: "pending", connectionId: inserted?.id };
}
