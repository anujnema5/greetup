import { z } from "zod";

import type { MatchPrepActivityOptionRow } from "@/features/profile-setup/types/profile-setup-api.types";

import { validateSessionActivitySelections } from "@/features/matching/utils/session-activities.utils";

export const openToConnectEnableSchema = z.object({
  headline: z.string().max(120),
  lookingForIds: z.array(z.string()).min(1, 'Choose at least one "looking for" option.'),
  activityIds: z.array(z.string()),
  activityDetails: z.record(z.string(), z.string()),
});

export type OpenToConnectEnableFormValues = z.infer<typeof openToConnectEnableSchema>;

export function createOpenToConnectEnableSchema(activities: MatchPrepActivityOptionRow[]) {
  return openToConnectEnableSchema.superRefine((data, ctx) => {
    const activityError = validateSessionActivitySelections(
      activities,
      data.activityIds,
      data.activityDetails,
      { maxCount: 3 },
    );
    if (activityError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: activityError,
        path: ["activityIds"],
      });
    }
  });
}
