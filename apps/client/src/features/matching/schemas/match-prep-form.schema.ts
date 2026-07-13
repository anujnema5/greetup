import { z } from "zod";

import type { MatchPrepActivityOptionRow } from "@/features/profile-setup/types/profile-setup-api.types";

import { validateSessionActivitySelections } from "../utils/session-activities.utils";

const matchPrepLocationSchema = z
  .object({
    country: z.string(),
    countryCode: z.string(),
    region: z.string().optional(),
    regionCode: z.string().optional(),
    city: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    source: z.enum(["current", "manual"]).optional(),
  })
  .nullable();

export const matchPrepFormSchema = z.object({
  matchIntent: z.enum(["quick", "activity"]),
  activityIds: z.array(z.string()),
  activityDetails: z.record(z.string(), z.string()),
  moodIds: z.array(z.string()).min(1, "Choose at least one mood."),
  lookingForIds: z
    .array(z.string())
    .min(1, 'Choose at least one "looking for" option.'),
  interestIds: z.array(z.string()).min(1, "Choose at least one interest."),
  connectionPreference: z.enum([
    "same_profession",
    "different_profession",
    "open_to_anyone",
  ]),
  locationPreferenceEnabled: z.boolean(),
  distancePreference: z.enum(["random", "same_city", "same_country", "global"]),
  location: matchPrepLocationSchema,
  sessionGoal: z.string(),
});

export type MatchPrepFormValues = z.infer<typeof matchPrepFormSchema>;

export const EMPTY_MATCH_PREP_FORM_VALUES: MatchPrepFormValues = {
  matchIntent: "quick",
  activityIds: [],
  activityDetails: {},
  moodIds: [],
  lookingForIds: [],
  interestIds: [],
  connectionPreference: "open_to_anyone",
  locationPreferenceEnabled: false,
  distancePreference: "random",
  location: null,
  sessionGoal: "",
};

export function createMatchPrepFormSchema(activities: MatchPrepActivityOptionRow[]) {
  return matchPrepFormSchema.superRefine((data, ctx) => {
    const activityError = validateSessionActivitySelections(
      activities,
      data.activityIds,
      data.activityDetails,
      {
        requireAtLeastOne: data.matchIntent === "activity",
        maxCount: 3,
      },
    );
    if (activityError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: activityError,
        path: ["activityIds"],
      });
    }

    if (
      data.locationPreferenceEnabled &&
      (!data.location ||
        typeof data.location.latitude !== "number" ||
        typeof data.location.longitude !== "number")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a location to enable location-based matching.",
        path: ["location"],
      });
    }
  });
}
