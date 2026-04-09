import { z } from "zod";

const connectionPreferenceValues = [
  "same_profession",
  "different_profession",
  "open_to_anyone",
] as const;

export const matchPrepSaveBodySchema = z
  .object({
    moodIds: z.array(z.string().uuid()).max(12),
    lookingForIds: z.array(z.string().uuid()).max(12),
    /** Updates profile `profile_interests` (same as onboarding interests) for matching snapshot. */
    interestIds: z.array(z.string().uuid()).max(10),
    sessionGoal: z.string().max(280).optional().nullable(),
    connectionPreference: z.enum(connectionPreferenceValues).optional(),
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
  );

export type MatchPrepSaveBody = z.infer<typeof matchPrepSaveBodySchema>;
