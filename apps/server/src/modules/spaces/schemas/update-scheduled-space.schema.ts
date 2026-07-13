import { z } from "zod";

import { LAUNCH_MAX_SPACE_PARTICIPANTS } from "@/modules/spaces/constants/space-capacity";

import { spaceAdvancedOptionsBodySchema } from "./create-space.schema";

export const updateScheduledSpaceBodySchema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().nullable().optional(),
    categoryId: z.string().uuid().optional(),
    description: z.string().max(2000).nullable().optional(),
    visibility: z.enum(["private", "public"]).optional(),
    maxParticipants: z.number().int().min(2).max(LAUNCH_MAX_SPACE_PARTICIPANTS).optional(),
    advancedOptions: spaceAdvancedOptionsBodySchema,
    invitedUserIds: z.array(z.string().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.invitedUserIds && data.maxParticipants != null) {
      const cap = data.maxParticipants - 1;
      if (data.invitedUserIds.length > cap) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `You can invite at most ${cap} ${cap === 1 ? "person" : "people"} for a ${data.maxParticipants}-seat space (you use one seat).`,
          path: ["invitedUserIds"],
        });
      }
    }
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.scheduledStartAt !== undefined ||
      d.scheduledEndAt !== undefined ||
      d.categoryId !== undefined ||
      d.description !== undefined ||
      d.visibility !== undefined ||
      d.maxParticipants !== undefined ||
      d.advancedOptions !== undefined ||
      d.invitedUserIds !== undefined,
    { message: "Provide at least one field to update" },
  );

export type UpdateScheduledSpaceBody = z.infer<typeof updateScheduledSpaceBodySchema>;
