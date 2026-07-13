import { ValidationError } from "@/shared/errors";

import {
  GUEST_DISPLAY_NAME_MAX_LENGTH,
  GUEST_DISPLAY_NAME_MIN_LENGTH,
} from "../constants/guest-trial.constants";

const ALLOWED_DISPLAY_NAME = /^[\p{L}\p{N}\s.'-]+$/u;

const URL_OR_EMAIL_PATTERN =
  /(?:https?:\/\/|www\.)|@[\w.-]+\.\w{2,}|[\w.-]+@[\w.-]+\.\w{2,}/i;

/** Minimal blocklist stub — expand or plug shared moderation later. */
const BLOCKED_DISPLAY_NAME_TERMS = ["admin", "moderator", "support", "greetup"] as const;

export function normalizeGuestDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function assertGuestDisplayNameValid(raw: string): string {
  const displayName = normalizeGuestDisplayName(raw);

  if (displayName.length < GUEST_DISPLAY_NAME_MIN_LENGTH) {
    throw new ValidationError("Display name must be at least 2 characters");
  }
  if (displayName.length > GUEST_DISPLAY_NAME_MAX_LENGTH) {
    throw new ValidationError("Display name must be at most 30 characters");
  }
  if (!ALLOWED_DISPLAY_NAME.test(displayName)) {
    throw new ValidationError(
      "Display name can only include letters, numbers, spaces, and . ' -",
    );
  }
  if (URL_OR_EMAIL_PATTERN.test(displayName)) {
    throw new ValidationError("Display name cannot include URLs or email addresses");
  }

  const lowered = displayName.toLowerCase();
  for (const term of BLOCKED_DISPLAY_NAME_TERMS) {
    if (lowered.includes(term)) {
      throw new ValidationError("Please choose a different display name");
    }
  }

  return displayName;
}
