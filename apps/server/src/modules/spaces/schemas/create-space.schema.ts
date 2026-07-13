import { z } from "zod";

import { LAUNCH_MAX_SPACE_PARTICIPANTS } from "@/modules/spaces/constants/space-capacity";
import { MAX_SPACE_ACTIVITY_SELECTIONS } from "@/modules/session-activities";
import { activitySelectionBodySchema } from "@/modules/profile/schemas/match-prep.schema";

export const spaceAdvancedOptionsBodySchema = z
  .object({
    shouldHostStartMeeting: z.boolean().optional(),
    shouldMeetingAutoStart: z.boolean().optional(),
    spaceExpirationMinutes: z
      .number()
      .int()
      .min(1)
      .max(10080)
      .nullable()
      .optional(),
    deleteSpaceAfterCall: z.boolean().optional(),
    hostControlsActiveSpeaker: z.boolean().optional(),
  })
  .optional();


export const createSpaceBodySchema = z
  .object({
    /** `direct` = 1:1-style; `space` = group space (default). */
    roomType: z.enum(["direct", "space"]).optional(),
    categoryId: z.string().uuid(),
    title: z.string().min(1).max(160).trim(),
    description: z.string().max(2000).trim().optional(),
    visibility: z.enum(["private", "public"]),
    maxParticipants: z.number().int().min(2).max(LAUNCH_MAX_SPACE_PARTICIPANTS),
    scheduleMode: z.enum(["instant", "scheduled"]),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().optional(),
    advancedOptions: spaceAdvancedOptionsBodySchema,
    /** User IDs must be accepted connections of the host; deduped server-side. */
    invitedUserIds: z.array(z.string().min(1)).optional(),
    /** Optional session activities for this space. */
    activitySelections: z
      .array(activitySelectionBodySchema)
      .max(MAX_SPACE_ACTIVITY_SELECTIONS)
      .optional(),
  })
  .superRefine((data, ctx) => {
    const cap = data.maxParticipants - 1;
    if (data.invitedUserIds && data.invitedUserIds.length > cap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `You can invite at most ${cap} ${cap === 1 ? "person" : "people"} for a ${data.maxParticipants}-seat space (you use one seat).`,
        path: ["invitedUserIds"],
      });
    }
    if (data.scheduleMode === "scheduled" && !data.scheduledStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scheduledStartAt is required when scheduleMode is scheduled",
        path: ["scheduledStartAt"],
      });
    }
    if (
      data.scheduledStartAt &&
      data.scheduledEndAt &&
      new Date(data.scheduledEndAt) <= new Date(data.scheduledStartAt)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scheduledEndAt must be after scheduledStartAt",
        path: ["scheduledEndAt"],
      });
    }
  });

export type CreateSpaceBody = z.infer<typeof createSpaceBodySchema>;
