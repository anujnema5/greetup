import { z } from "zod";

import { GUEST_MATCH_PREP_MIN_INTERESTS } from "../constants/guest-trial.constants";

const GUEST_MATCH_PREP_MAX_INTERESTS = 5;

export const guestMatchPrepBodySchema = z
  .object({
    moodIds: z.array(z.string().uuid()).min(1).max(12),
    lookingForIds: z.array(z.string().uuid()).min(1).max(12),
    interestIds: z
      .array(z.string().uuid())
      .min(GUEST_MATCH_PREP_MIN_INTERESTS)
      .max(GUEST_MATCH_PREP_MAX_INTERESTS),
  })
  .refine(
    (data) =>
      data.moodIds.length > 0 &&
      data.lookingForIds.length > 0 &&
      data.interestIds.length >= GUEST_MATCH_PREP_MIN_INTERESTS,
    {
      message: `Pick at least one mood, one looking-for option, and ${GUEST_MATCH_PREP_MIN_INTERESTS} interests`,
      path: ["moodIds"],
    },
  );

export type GuestMatchPrepBody = z.infer<typeof guestMatchPrepBodySchema>;
