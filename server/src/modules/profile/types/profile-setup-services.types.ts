import type { SaveProfileSetupBody } from "../schemas/profile-setup.schema";
import type { FormStep } from "./form-field.type";

/** POST /profile/profile-setup */
export interface SaveProfileSetupParams {
  userId: string;
  body: SaveProfileSetupBody;
}

export interface SaveProfileSetupResult {
  profileCompletion: number;
  isProfileComplete: boolean;
}

/** GET /profile/setup-steps query + service */
export interface FetchProfileStepsParams {
  userId: string;
  page?: number;
  limit?: number;
  /** When true, always recalculate from profile data instead of using stored profileCompletion */
  forceRecalculate?: boolean;
}

export interface ProfileSetupShortenedOnboardingMeta {
  active: boolean;
  matchPrepComplete: boolean;
  skippedInterestsStep: boolean;
}

export interface FetchProfileStepsResult {
  steps: FormStep[];
  profileCompletion: number;
  isProfileComplete: boolean;
  shortenedOnboarding?: ProfileSetupShortenedOnboardingMeta;
  meta: {
    page: number;
    limit: number;
    totalSteps: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
