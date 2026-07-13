import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/core/database";
import { roomFriendInvites } from "@/core/database/schema";

export const roomInvitesRepository = {
  /** Find a pending or accepted friend invite for this user in this room. */
  async findFriendInvite(roomId: string, userId: string) {
    return db.query.roomFriendInvites.findFirst({
      where: and(
        eq(roomFriendInvites.roomId, roomId),
        eq(roomFriendInvites.inviteeUserId, userId),
        inArray(roomFriendInvites.status, ["pending", "accepted"]),
      ),
      columns: { id: true },
    });
  },

  async listPendingInviteeUserIds(roomId: string): Promise<string[]> {
    const rows = await db.query.roomFriendInvites.findMany({
      where: and(
        eq(roomFriendInvites.roomId, roomId),
        eq(roomFriendInvites.status, "pending"),
      ),
      columns: { inviteeUserId: true },
    });
    return rows.map((r) => r.inviteeUserId);
  },

  /** Pending/accepted friend invites for a room (e.g. notify invitees when session goes live). */
  async listActiveFriendInviteeUserIds(roomId: string) {
    return db.query.roomFriendInvites.findMany({
      where: and(
        eq(roomFriendInvites.roomId, roomId),
        inArray(roomFriendInvites.status, ["pending", "accepted"]),
      ),
      columns: {
        inviteeUserId: true,
      },
    });
  },
};
