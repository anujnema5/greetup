import { z } from "zod";

import {
  GUEST_DISPLAY_NAME_MAX_LENGTH,
  GUEST_DISPLAY_NAME_MIN_LENGTH,
} from "../constants/guest-trial.constants";

export const patchGuestProfileBodySchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(GUEST_DISPLAY_NAME_MIN_LENGTH, "Display name must be at least 2 characters")
    .max(GUEST_DISPLAY_NAME_MAX_LENGTH, "Display name must be at most 30 characters"),
});

export type PatchGuestProfileBody = z.infer<typeof patchGuestProfileBodySchema>;
