/**
 * Profile steps service – builds onboarding steps with pre-filled values and pagination.
 */

import logger from "@/core/logging";
import { getConvertedGuestOnboardingHints } from "@/modules/guest";
import type {
  FormStep,
  FormField,
  FetchProfileStepsParams,
  FetchProfileStepsResult,
} from "../types";
import type { ProfileForSteps, StepOptions } from "../repositories/profile-steps.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";
import { isPlaceholderUsername } from "../lib/username";

const GUEST_PLACEHOLDER_USERNAME_PREFIX = "guest_";
const PROFILE_INTERESTS_STEP_TITLE = "Your interests";
const USERNAME_STEP_TITLE = "Username";

function resolveUsernameFieldValue(username: string | null | undefined): string | null {
  if (!username || isPlaceholderUsername(username)) return null;
  return username.trim().toLowerCase();
}

/** Default and max step page size */
export const STEP_PAGE_SIZE_DEFAULT = 6;
export const STEP_PAGE_SIZE_MAX = 10;
export const PROFILE_COMPLETE_THRESHOLD = 80;

/**
 * Build step list with fields and pre-filled values from profile and options.
 */
function buildSteps(profile: ProfileForSteps | undefined, options: StepOptions): FormStep[] {
  const displayName = profile?.user?.displayName ?? profile?.user?.name ?? null;
  const usernameValue = resolveUsernameFieldValue(profile?.user?.username ?? null);

  const goalsOptions = options.goals.map((g) => ({
    id: g.id,
    name: g.displayName,
    description: g.description ?? undefined,
    emoji: g.emoji ?? undefined,
  }));
  const goalsValue =
    profile?.goals?.map((pg) => ({
      id: pg.goal.id,
      name: pg.goal.displayName,
      description: pg.goal.description ?? undefined,
    })) ?? [];

  const interestsOptions = options.interests.map((i) => ({
    id: i.id,
    name: i.displayName,
    category: i.category,
    emoji: i.emoji ?? undefined,
  }));
  const interestsValue =
    profile?.interests?.map((pi) => ({
      id: pi.interest.id,
      name: pi.interest.displayName,
      category: pi.interest.category,
    })) ?? [];

  const professionsOptions = options.professions.map((p) => ({
    id: p.id,
    name: p.displayName,
    category: p.category,
  }));
  const professionValue =
    profile?.profession ??
    (profile?.professions?.[0]
      ? {
          id: profile.professions[0].profession.id,
          name: profile.professions[0].profession.displayName,
          category: profile.professions[0].profession.category,
        }
      : null);

  const photosValue =
    profile?.photos
      ?.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((p) => ({
        id: p.id,
        url: p.photoUrl,
        order: p.order,
        isVerified: p.isVerified,
      })) ?? [];

  const steps: FormStep[] = [
    {
      step: 1,
      title: "Tell us about you",
      fields: [
        {
          key: "displayName",
          name: "displayName",
          label: "Display name",
          placeholder: "Enter your name",
          type: "text",
          required: true,
          value: displayName,
        },
        {
          key: "age",
          name: "age",
          label: "Age",
          placeholder: "Enter your age",
          type: "number",
          required: true,
          min: 18,
          max: 99,
          value: profile?.age ?? null,
        },
        {
          key: "gender",
          name: "gender",
          label: "Gender",
          placeholder: "Select gender",
          type: "select",
          required: true,
          options: ["male", "female", "other"],
          value: profile?.gender ?? null,
        },
      ],
    },
    {
      step: 2,
      title: "Your goals",
      fields: [
        {
          key: "goals",
          name: "goals",
          label: "What do you want from Greetup?",
          placeholder: "Select your goals",
          type: "multi-select",
          required: true,
          options: goalsOptions,
          value: goalsValue,
        },
      ],
    },
    {
      step: 3,
      title: "Your interests",
      fields: [
        {
          key: "interests",
          name: "interests",
          label: "Interests",
          placeholder: "Select your interests",
          type: "multi-select",
          max: 10,
          required: true,
          options: interestsOptions,
          value: interestsValue,
        },
      ],
    },
    {
      step: 4,
      title: "Complete your profile",
      fields: [
        {
          key: "profession",
          name: "profession",
          label: "Profession",
          placeholder: "What do you do?",
          type: "select",
          required: false,
          options: professionsOptions,
          value: professionValue,
        },
        {
          key: "photos",
          name: "photos",
          label: "Profile photo",
          type: "photo-upload",
          required: true,
          max: 6,
          value: photosValue,
        },
        {
          key: "instagram",
          name: "instagram",
          label: "Instagram",
          placeholder: "your_handle",
          type: "text",
          required: false,
          maxLength: 30,
          description: "Your Instagram username (without @)",
          value: profile?.socials?.instagram ?? null,
        },
      ],
    },
    {
      step: 5,
      title: USERNAME_STEP_TITLE,
      description: "Used in your profile URL.",
      fields: [
        {
          key: "username",
          name: "username",
          label: "Your username",
          placeholder: "yourname",
          type: "username-picker",
          required: true,
          minLength: 3,
          maxLength: 30,
          value: usernameValue,
        },
      ],
    },
  ];

  return steps;
}

/**
 * Shortened onboarding for converted guests: drop interests step and clear placeholder username.
 */
function applyConvertedGuestOnboardingSteps(
  steps: FormStep[],
  profile: ProfileForSteps | undefined,
  skipProfileInterestsStep: boolean,
  isConvertedGuest: boolean,
): FormStep[] {
  let next = steps;

  if (skipProfileInterestsStep) {
    next = next
      .filter((step) => step.title !== PROFILE_INTERESTS_STEP_TITLE)
      .map((step, index) => ({ ...step, step: index + 1 }));
  }

  const username = profile?.user?.username?.trim();
  if (
    isConvertedGuest &&
    username?.toLowerCase().startsWith(GUEST_PLACEHOLDER_USERNAME_PREFIX)
  ) {
    next = next.map((step) => ({
      ...step,
      fields: step.fields.map((field) =>
        field.key === "username" ? { ...field, value: null } : field,
      ),
    }));
  }

  return next;
}

/**
 * Calculate profile completion from all fields in all steps (0–100).
 * Counts every question, not just required ones.
 * Optional steps (e.g. prompt Q&A) are excluded so new questions cannot push users below the onboarded threshold.
 */
function calculateCompletion(steps: FormStep[]): number {
  let total = 0;
  let filled = 0;
  for (const step of steps) {
    if (step.optional) continue;
    for (const field of step.fields) {
      total++;
      const v = field.value;
      if (
        v !== null &&
        v !== undefined &&
        v !== "" &&
        (Array.isArray(v) ? v.length > 0 : true)
      ) {
        filled++;
      }
    }
  }
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

function hasRequiredFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function areRequiredFieldsComplete(steps: FormStep[]): boolean {
  return steps.every((step) => {
    if (step.optional) return true;
    return step.fields
      .filter((field) => field.required)
      .every((field) => hasRequiredFieldValue(field.value));
  });
}

/** All onboarding steps with current DB values — not paginated. */
export async function buildAllProfileStepsForUser(userId: string): Promise<FormStep[]> {
  const [profile, options, onboardingHints] = await Promise.all([
    profileStepsRepository.getProfileForSteps(userId),
    profileStepsRepository.fetchStepOptions(),
    getConvertedGuestOnboardingHints(userId),
  ]);

  return applyConvertedGuestOnboardingSteps(
    buildSteps(profile, options),
    profile,
    onboardingHints.skipProfileInterestsStep,
    onboardingHints.isConvertedGuest,
  );
}

export function computeProfileProgressFromSteps(steps: FormStep[]): {
  profileCompletion: number;
  isOnboardingComplete: boolean;
} {
  return {
    profileCompletion: calculateCompletion(steps),
    isOnboardingComplete: areRequiredFieldsComplete(steps),
  };
}

/**
 * Fetch profile steps with optional pagination.
 * Steps are ordered 1–5; page/limit slice which steps are returned.
 */
export async function fetchProfileStepsService(
  params: FetchProfileStepsParams
): Promise<FetchProfileStepsResult> {
  const { userId, page = 1, limit = STEP_PAGE_SIZE_DEFAULT, forceRecalculate } = params;

  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(
    Math.max(1, Math.floor(limit)),
    STEP_PAGE_SIZE_MAX
  );

  const [profile, options, onboardingHints] = await Promise.all([
    profileStepsRepository.getProfileForSteps(userId),
    profileStepsRepository.fetchStepOptions(),
    getConvertedGuestOnboardingHints(userId),
  ]);

  const allSteps = applyConvertedGuestOnboardingSteps(
    buildSteps(profile, options),
    profile,
    onboardingHints.skipProfileInterestsStep,
    onboardingHints.isConvertedGuest,
  );
  const totalSteps = allSteps.length;
  const totalPages = Math.ceil(totalSteps / safeLimit);
  const start = (safePage - 1) * safeLimit;
  const steps = allSteps.slice(start, start + safeLimit);

  // When forceRecalculate or profileCompletion is null/undefined, use calculated value.
  // Important: profileCompletion can be 0 from DB default - 0 ?? calculated returns 0, so we must force recalc on save.
  const profileCompletion =
    forceRecalculate || profile?.profileCompletion == null
      ? calculateCompletion(allSteps)
      : profile.profileCompletion;
  const isProfileComplete = profileCompletion >= PROFILE_COMPLETE_THRESHOLD;

  logger.debug("profile_steps_fetched", {
    userId,
    page: safePage,
    limit: safeLimit,
    profileCompletion,
    isProfileComplete,
    stepsReturned: steps.length,
  });

  const shortenedOnboarding = onboardingHints.isConvertedGuest
    ? {
        active: true,
        matchPrepComplete: onboardingHints.matchPrepComplete,
        skippedInterestsStep: onboardingHints.skipProfileInterestsStep,
      }
    : undefined;

  return {
    steps,
    profileCompletion,
    isProfileComplete,
    shortenedOnboarding,
    meta: {
      page: safePage,
      limit: safeLimit,
      totalSteps,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}
