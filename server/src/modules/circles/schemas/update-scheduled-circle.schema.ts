import { z } from "zod";

export const updateScheduledCircleBodySchema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    scheduledStartAt: z.string().datetime().optional(),
    scheduledEndAt: z.string().datetime().nullable().optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.scheduledStartAt !== undefined ||
      d.scheduledEndAt !== undefined,
    { message: "Provide at least one of: title, scheduledStartAt, scheduledEndAt" },
  );

export type UpdateScheduledCircleBody = z.infer<typeof updateScheduledCircleBodySchema>;
