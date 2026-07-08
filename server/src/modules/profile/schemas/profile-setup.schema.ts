import { z } from "zod";

const STEP_PAGE_SIZE_DEFAULT = 6;
const STEP_PAGE_SIZE_MAX = 10;

/** Query params for GET /setup-steps (step pagination) */
export const fetchProfileStepsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(STEP_PAGE_SIZE_MAX).default(STEP_PAGE_SIZE_DEFAULT),
});

export type FetchProfileStepsQuery = z.infer<typeof fetchProfileStepsQuerySchema>;

/* STEP 1 – Basic Identity (legacy / docs shape; live API uses saveStep1Schema) */
export const step1Schema = z.object({
  displayName: z.string().min(2).max(30),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((s) => s.trim().toLowerCase()),
  age: z.number().min(18).max(60),
  gender: z.enum(["male", "female", "other"]),
  city: z.string().min(2),
  country: z.string().min(2),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

/* STEP 2 – Language & Communication */
export const step2Schema = z.object({
  languages: z.array(z.string()).min(1),
  primaryLanguage: z.string(),
  voiceCallPreference: z.enum(["yes", "no"]),
  videoCallPreference: z.enum(["yes", "no"]),
});

/* STEP 3 – Interests */
export const step3Schema = z.object({
  interests: z.array(z.string()).max(7),
  musicGenres: z.array(z.string()).max(5),
  personalityTags: z.array(z.string()).max(5),
});

/* STEP 4 – Mood & Intent */
export const step4Schema = z.object({
  moodId: z.string(),
  onlineIntent: z.enum([
    "bored",
    "lonely",
    "party",
    "deep-talk",
    "just-listening",
  ]),
  availableFor: z.number().min(10).max(120),
  dateMode: z.boolean(),
  lookingFor: z.string().optional(),
  genderPreference: z.string().optional(),
  maxGroupSize: z.number().min(2).max(10).optional(),
  conversationBoundary: z.enum(["clean", "casual", "flirty"]).optional(),
});

/* STEP 5 – Bio & Photo */
export const step5Schema = z.object({
  bio: z.string().max(150).optional(),
});

/** Request body schemas for POST /profile-setup (per-step save) - aligned with profile-steps.service */

/* Step 1 – Basic Identity */
export const saveStep1Schema = z.object({
  displayName: z.string().min(2).max(100),
  age: z.number().int().min(18).max(99),
  gender: z.enum(["male", "female", "other"]),
  country: z
    .object({
      code: z.string().min(2).max(8),
      name: z.string().min(2).max(120),
    })
    .optional(),
});

/* Step 2 – Goals */
export const saveStep2Schema = z.object({
  goals: z.array(z.object({ id: z.string().uuid() })).min(1).max(10),
});

/* Step 3 – Interests */
export const saveStep3Schema = z.object({
  interests: z.array(z.object({ id: z.string().uuid() })).min(1).max(10),
});

/* Step 4 – Profession */
export const saveStep4Schema = z.object({
  profession: z
    .object({
      id: z.string().uuid(),
      name: z.string().optional(),
      category: z.string().optional(),
    })
    .nullable(),
});

/* Step 5 – Profession, Bio, Photos, Socials & matching preferences (profile editor) */
export const saveStep5Schema = z.object({
  profession: z
    .object({
      id: z.string().uuid(),
      name: z.string().optional(),
      category: z.string().optional(),
    })
    .nullable()
    .optional(),
  bio: z.string().max(500).optional(),
  photos: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        url: z.string().url(),
        order: z.number().int().min(0).optional(),
      })
    )
    .max(6)
    .optional(),
  instagram: z.string().max(30).optional(),
  preferredGender: z.enum(["any", "male", "female", "others", "same"]).optional(),
  distancePreference: z
    .enum(["nearby", "same city", "same country", "random", "global"])
    .optional(),
  ageRange: z
    .object({
      min: z.number().int().min(18).max(99),
      max: z.number().int().min(18).max(99),
    })
    .optional(),
});

/**
 * Step 6 – Prompt Questions (optional free-text answers).
 * No longer part of onboarding, but still used by the post-onboarding profile prompts editor.
 */
export const saveStep6Schema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answer: z.string().min(10).max(300),
      }),
    )
    .max(6),
});

/* Step 7 – Username (privacy-focused public link) */
export const saveStep7Schema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers, and underscores")
    .transform((s) => s.trim().toLowerCase()),
});

const saveStepDataSchema = z.discriminatedUnion("step", [
  z.object({ step: z.literal(1), data: saveStep1Schema }),
  z.object({ step: z.literal(2), data: saveStep2Schema }),
  z.object({ step: z.literal(3), data: saveStep3Schema }),
  z.object({ step: z.literal(4), data: saveStep4Schema }),
  z.object({ step: z.literal(5), data: saveStep5Schema }),
  z.object({ step: z.literal(6), data: saveStep6Schema }),
  z.object({ step: z.literal(7), data: saveStep7Schema }),
]);

export const saveProfileSetupBodySchema = saveStepDataSchema;
export type SaveProfileSetupBody = z.infer<typeof saveProfileSetupBodySchema>;