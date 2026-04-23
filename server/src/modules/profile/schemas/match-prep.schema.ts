import { z } from "zod";

const connectionPreferenceValues = [
  "same_profession",
  "different_profession",
  "open_to_anyone",
] as const;

const distancePreferenceValues = [
  "random",
  "same_city",
  "same_country",
  "global",
] as const;

export const matchPrepSaveBodySchema = z
  .object({
    moodIds: z.array(z.string().uuid()).max(12),
    lookingForIds: z.array(z.string().uuid()).max(12),
    /** Updates profile `profile_interests` (same as onboarding interests) for matching snapshot. */
    interestIds: z.array(z.string().uuid()).max(10),
    sessionGoal: z.string().max(280).optional().nullable(),
    connectionPreference: z.enum(connectionPreferenceValues).optional(),
    locationPreferenceEnabled: z.boolean().optional(),
    distancePreference: z.enum(distancePreferenceValues).optional(),
    location: z
      .object({
        country: z.string().min(1).max(120),
        countryCode: z.string().min(2).max(8),
        region: z.string().max(120).optional(),
        regionCode: z.string().max(20).optional(),
        city: z.string().max(120).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        source: z.enum(["current", "manual"]).optional(),
      })
      .optional(),
    /** When set, records that this browser tab session has completed match prep (saved). */
    clientSessionId: z.string().min(8).max(128).optional(),
  })
  .refine(
    (d) =>
      d.moodIds.length > 0 &&
      d.lookingForIds.length > 0 &&
      d.interestIds.length > 0,
    {
      message: "Pick at least one mood, one looking-for option, and one interest",
      path: ["moodIds"],
    },
  )
  .refine((d) => !d.locationPreferenceEnabled || Boolean(d.distancePreference), {
    message: "distancePreference is required when location preference is enabled",
    path: ["distancePreference"],
  })
  .refine((d) => {
    if (!d.locationPreferenceEnabled) return true;
    return Boolean(
      d.location?.country &&
        d.location?.countryCode &&
        typeof d.location.latitude === "number" &&
        typeof d.location.longitude === "number",
    );
  }, {
    message: "Location with latitude/longitude is required when location preference is enabled",
    path: ["location"],
  })
  .refine((d) => {
    if (d.distancePreference !== "same_city") return true;
    return d.location == null || Boolean(d.location.city);
  }, {
    message: "City is required for same_city matching",
    path: ["location", "city"],
  });

export type MatchPrepSaveBody = z.infer<typeof matchPrepSaveBodySchema>;
