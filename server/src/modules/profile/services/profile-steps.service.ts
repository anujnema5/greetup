/**
 * Profile steps service – builds onboarding steps with pre-filled values and pagination.
 */

import type {
  FormStep,
  FormField,
  FetchProfileStepsParams,
  FetchProfileStepsResult,
} from "../types";
import type { ProfileForSteps, StepOptions } from "../repositories/profile-steps.repository";
import { profileStepsRepository } from "../repositories/profile-steps.repository";

/** Default and max step page size */
export const STEP_PAGE_SIZE_DEFAULT = 6;
export const STEP_PAGE_SIZE_MAX = 10;
export const PROFILE_COMPLETE_THRESHOLD = 80;

/**
 * Build step list with fields and pre-filled values from profile and options.
 */
function buildSteps(profile: ProfileForSteps | undefined, options: StepOptions): FormStep[] {
  const displayName = profile?.user?.displayName ?? profile?.user?.name ?? null;
  const usernameValue = profile?.user?.username ?? null;
  const countryValue =
    profile?.location?.countryCode && profile?.location?.country
      ? { code: profile.location.countryCode, name: profile.location.country }
      : null;

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
  const selectedProfessionIds = profile?.professions?.map((pp) => pp.profession.id) ?? [];
  const professionValue =
    profile?.profession ?? // legacy text on userProfiles
    (profile?.professions?.[0]
      ? {
        id: profile.professions[0].profession.id,
        name: profile.professions[0].profession.displayName,
        category: profile.professions[0].profession.category,
      }
      : null);

  const pref = profile?.preferences;

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
          key: "username",
          name: "username",
          label: "Username",
          placeholder: "your_handle",
          type: "text",
          required: true,
          minLength: 3,
          maxLength: 30,
          autoComplete: "username",
          description:
            "This becomes your public link. Use at least 3 characters; letters, numbers, and underscores only.",
          value: usernameValue,
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
        {
          key: "country",
          name: "country",
          label: "Country",
          placeholder: "Select your country",
          type: "country-select",
          required: true,
          value: countryValue,
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
          label: "What do you want from Circlo?",
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
      title: "Profession",
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
      ],
    },
    {
      step: 5,
      title: "Preferences",
      optional: true,
      fields: [
        {
          key: "preferredGender",
          name: "preferredGender",
          label: "Preferred gender",
          placeholder: "Select preference",
          type: "select",
          required: false,
          options: ["any", "male", "female", "others", "same"],
          value: pref?.preferredGender ?? null,
        },
        {
          key: "distancePreference",
          name: "distancePreference",
          label: "Distance preference",
          placeholder: "Select preference",
          type: "select",
          required: false,
          options: ["nearby", "same city", "same country", "random", "global"],
          value: pref?.distancePreference ?? null,
        },
        {
          key: "ageRange",
          name: "ageRange",
          label: "Age preference",
          type: "range",
          min: 18,
          max: 99,
          value: {
            min: pref?.minAge ?? 18,
            max: pref?.maxAge ?? 99,
          },
        },
      ],
    },
    {
      step: 6,
      title: "Complete your profile",
      fields: [
        {
          key: "bio",
          name: "bio",
          label: "Bio",
          placeholder: "Tell us something about yourself",
          type: "textarea",
          maxLength: 500,
          value: profile?.bio ?? null,
        },
        {
          key: "photos",
          name: "photos",
          label: "Profile photos",
          type: "photo-upload",
          max: 6,
          value: photosValue,
        },
      ],
    },
  ];

  return steps;
}

/**
 * Calculate profile completion from all fields in all steps (0–100).
 * Counts every question, not just required ones.
 */
function calculateCompletion(steps: FormStep[]): number {
  let total = 0;
  let filled = 0;
  for (const step of steps) {
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

/**
 * Fetch profile steps with optional pagination.
 * Steps are ordered 1–6; page/limit slice which steps are returned.
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

  const [profile, options] = await Promise.all([
    profileStepsRepository.getProfileForSteps(userId),
    profileStepsRepository.fetchStepOptions(),
  ]);

  const allSteps = buildSteps(profile, options);
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

  return {
    steps,
    profileCompletion,
    isProfileComplete,
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
