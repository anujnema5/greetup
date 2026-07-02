import { z } from "zod";

import {
  ACTIVITY_DETAIL_STORAGE_MAX,
  MAX_MATCH_PREP_ACTIVITY_SELECTIONS,
} from "@/modules/session-activities";

export const openToConnectActivitySelectionSchema = z.object({
  activityId: z.string().uuid(),
  detail: z.string().max(ACTIVITY_DETAIL_STORAGE_MAX).optional().nullable(),
});

export const enableOpenToConnectBodySchema = z.object({
  source: z.enum(["manual", "post_no_match"]).default("manual"),
  headline: z.string().max(120).optional().nullable(),
  activitySelections: z
    .array(openToConnectActivitySelectionSchema)
    .max(MAX_MATCH_PREP_ACTIVITY_SELECTIONS)
    .optional(),
  exposeMoods: z.boolean().optional(),
  exposeInterests: z.boolean().optional(),
});

export type EnableOpenToConnectBody = z.infer<typeof enableOpenToConnectBodySchema>;
