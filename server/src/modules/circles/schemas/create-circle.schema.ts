import { z } from "zod";

export const circleAdvancedOptionsBodySchema = z
  .object({
    shouldHostStartMeeting: z.boolean().optional(),
    shouldMeetingAutoStart: z.boolean().optional(),
    circleExpirationMinutes: z
      .number()
      .int()
      .min(1)
      .max(10080)
      .nullable()
      .optional(),
    deleteCircleAfterCall: z.boolean().optional(),
    hostControlsActiveSpeaker: z.boolean().optional(),
  })
  .optional();

export const createCircleBodySchema = z
  .object({
    categoryId: z.string().uuid(),
    title: z.string().min(1).max(160).trim(),
    description: z.string().max(2000).trim().optional(),
    visibility: z.enum(["private", "public"]),
    maxParticipants: z.number().int().min(2).max(100),
    scheduleMode: z.enum(["instant", "scheduled"]),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().optional(),
    advancedOptions: circleAdvancedOptionsBodySchema,
    /** User IDs must be accepted connections of the host; deduped server-side. */
    invitedUserIds: z.array(z.string().min(1)).max(50).optional(),
  })
  .superRefine((data, ctx) => {
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

export type CreateCircleBody = z.infer<typeof createCircleBodySchema>;
