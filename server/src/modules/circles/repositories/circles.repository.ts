import { and, asc, eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  circleCategories,
  circleFriendInvites,
  circleParticipants,
  circles,
  type CircleAdvancedOptions,
} from "@/core/database/schema";

export const circlesRepository = {
  async findActiveCategoryById(categoryId: string) {
    return db.query.circleCategories.findFirst({
      where: and(
        eq(circleCategories.id, categoryId),
        eq(circleCategories.isActive, true),
      ),
    });
  },

  async listActiveCategories() {
    return db.query.circleCategories.findMany({
      where: eq(circleCategories.isActive, true),
      orderBy: [asc(circleCategories.sortOrder), asc(circleCategories.displayName)],
      columns: {
        id: true,
        slug: true,
        displayName: true,
        emoji: true,
        description: true,
        sortOrder: true,
      },
    });
  },

  /**
   * Creates circle, host row, and friend invites in one transaction.
   * Invites use ON CONFLICT DO NOTHING on (circle_id, invitee_user_id) to tolerate duplicate IDs in the payload.
   */
  async createCircleWithHostAndInvites(params: {
    categoryId: string;
    hostUserId: string;
    title: string;
    description: string | null;
    visibility: "private" | "public";
    maxParticipants: number;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    status: "scheduled" | "live" | "ended" | "cancelled";
    startedAt: Date | null;
    inviteCode: string | null;
    advancedOptions: CircleAdvancedOptions;
    inviteeUserIds: string[];
  }) {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(circles)
        .values({
          categoryId: params.categoryId,
          hostUserId: params.hostUserId,
          title: params.title,
          description: params.description,
          visibility: params.visibility,
          maxParticipants: params.maxParticipants,
          scheduledStartAt: params.scheduledStartAt,
          scheduledEndAt: params.scheduledEndAt,
          status: params.status,
          startedAt: params.startedAt,
          endedAt: null,
          rtcRoomId: null,
          inviteCode: params.inviteCode,
          advancedOptions: params.advancedOptions,
        })
        .returning({
          id: circles.id,
          status: circles.status,
          inviteCode: circles.inviteCode,
          scheduledStartAt: circles.scheduledStartAt,
          startedAt: circles.startedAt,
        });

      if (!row) {
        throw new Error("Failed to create circle");
      }

      await tx.insert(circleParticipants).values({
        circleId: row.id,
        userId: params.hostUserId,
        role: "host",
      });

      if (params.inviteeUserIds.length > 0) {
        await tx
          .insert(circleFriendInvites)
          .values(
            params.inviteeUserIds.map((inviteeUserId) => ({
              circleId: row.id,
              inviterUserId: params.hostUserId,
              inviteeUserId,
              status: "pending" as const,
            })),
          )
          .onConflictDoNothing({
            target: [circleFriendInvites.circleId, circleFriendInvites.inviteeUserId],
          });
      }

      return row;
    });
  },
};
