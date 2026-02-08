import { z } from "zod";

const STEP_PAGE_SIZE_DEFAULT = 6;
const STEP_PAGE_SIZE_MAX = 10;

/** Query params for GET /setup-steps (step pagination) */
export const fetchProfileStepsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(STEP_PAGE_SIZE_MAX).default(STEP_PAGE_SIZE_DEFAULT),
});

export type FetchProfileStepsQuery = z.infer<typeof fetchProfileStepsQuerySchema>;

/* STEP 1 – Basic Identity */
export const step1Schema = z.object({
  displayName: z.string().min(2).max(30),
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