// profileSetup.types.ts

export interface ApiResponse<T = any> {
  success: boolean
  statusCode: number
  message: string
  data: T
  meta?: {
    page: number
    limit: number
    totalSteps: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  timestamp: string
}

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi-select'
  | 'radio'
  | 'country-select'
  | 'range'
  | 'toggle'
  | 'photo-upload'
  | 'username-picker'
// 💡 This unlocks perfect switch-case rendering later.
export interface ProfileSetupFieldBase {
  key: string
  /** UUID of the backing entity — present on prompt question fields, used to build save payloads. */
  id?: string
  name: string
  label: string
  type: FieldType
  value: unknown
  required?: boolean
  placeholder?: string
  description?: string
  autoComplete?: string
}

// Extended field types for specific input variations
export interface TextField extends ProfileSetupFieldBase {
  type: 'text' | 'textarea'
  minLength?: number
  maxLength?: number
}

export interface NumberField extends ProfileSetupFieldBase {
  type: 'number'
  min?: number
  max?: number
}

// Create a shared option for best practice; emoji comes from backend for card display
export interface SelectOption {
  id: string
  name: string
  description?: string
  category?: string
  emoji?: string
}

export interface SelectField extends ProfileSetupFieldBase {
  type: 'select' | 'multi-select' | 'radio' | 'country-select'
  options?: string[] | SelectOption[]
}

export interface RangeField extends ProfileSetupFieldBase {
  type: 'range'
  min: number
  max: number
  value: {
    min: number
    max: number
  }
}

export interface ToggleField extends ProfileSetupFieldBase {
  type: 'toggle'
  value: boolean
}

export interface PhotoUploadField extends ProfileSetupFieldBase {
  type: 'photo-upload'
  max?: number
}

export interface UsernamePickerField extends ProfileSetupFieldBase {
  type: 'username-picker'
  minLength?: number
  maxLength?: number
}

// Union type for all possible field types
export type ProfileSetupField =
  | TextField
  | NumberField
  | SelectField
  | RangeField
  | ToggleField
  | PhotoUploadField
  | UsernamePickerField

export interface ProfileSetupStep {
  step: number
  title: string
  /** Optional subtitle under the step title (server-driven when present). */
  description?: string | null
  optional?: boolean
  fields: ProfileSetupField[]
}

export interface ProfileSetupShortenedOnboardingMeta {
  active: boolean
  matchPrepComplete: boolean
  skippedInterestsStep: boolean
}

export interface ProfileSetupData {
  steps: ProfileSetupStep[]
  profileCompletion: number
  isProfileComplete: boolean
  shortenedOnboarding?: ProfileSetupShortenedOnboardingMeta
}

export type ProfileSetupApiResponse = ApiResponse<ProfileSetupData>

/** Save profile setup response (per-step) */
export interface SaveProfileSetupResponse {
  profileCompletion: number
  isProfileComplete: boolean
}

export type SaveProfileSetupApiResponse = ApiResponse<SaveProfileSetupResponse>

/** POST /profile/photos/presign */
export type PresignProfilePhotoData = {
  uploadUrl: string
  publicUrl: string
  key: string
  expiresIn: number
  contentType: string
  /** Send on the PUT with the file body (Content-Type + Cache-Control). */
  uploadHeaders?: Record<string, string>
}

/** Payload for POST /profile-setup - discriminated by step */
export type SaveProfileSetupPayload =
  | {
      step: 1;
      data: {
        displayName: string;
        age: number;
        gender: string;
        country?: { code: string; name: string };
      };
    }
  | { step: 2; data: { goals: Array<{ id: string }> } }
  | { step: 3; data: { interests: Array<{ id: string }> } }
  | { step: 4; data: { profession: { id: string; name?: string; category?: string } | null } }
  | {
      step: 5;
      data: {
        profession?: { id: string; name?: string; category?: string } | null;
        bio?: string;
        photos?: Array<{ url: string; order?: number }>;
        instagram?: string;
        preferredGender?: "any" | "male" | "female" | "others" | "same";
        distancePreference?: "nearby" | "same city" | "same country" | "random" | "global";
        ageRange?: { min: number; max: number };
      };
    }
  /** Step 6 is no longer part of onboarding but still used by the post-onboarding profile prompts editor. */
  | { step: 6; data: { answers: Array<{ questionId: string; answer: string }> } }
  | { step: 7; data: { username: string } }

/** GET /profile/match-prep/options */
export interface MatchPrepOptionRow {
  id: string
  name: string
  displayName: string
  description: string | null
}

export interface MatchPrepActivityOptionRow extends MatchPrepOptionRow {
  emoji: string | null
  detailMode: "none" | "language" | "topic" | "optional_topic"
  detailLabel: string | null
  detailPlaceholder: string | null
  detailMaxLength: number
  detailRequired: boolean
}

export interface MatchPrepActivitySelection {
  activityId: string
  activityName?: string
  displayName?: string
  emoji?: string | null
  detail: string | null
}

export interface MatchPrepOptionsData {
  moods: MatchPrepOptionRow[]
  lookingFor: MatchPrepOptionRow[]
  interests: MatchPrepOptionRow[]
  activities: MatchPrepActivityOptionRow[]
}

/** GET /profile/match-prep/current */
export interface MatchPrepCurrentData {
  moodIds: string[]
  lookingForIds: string[]
  interestIds: string[]
  matchIntent: "quick" | "activity"
  activitySelections: MatchPrepActivitySelection[]
  locationPreferenceEnabled: boolean
  distancePreference: "random" | "same_city" | "same_country" | "global"
  location: {
    country: string | null
    countryCode: string | null
    region: string | null
    regionCode: string | null
    city: string | null
    latitude: number | null
    longitude: number | null
  } | null
  connectionPreference:
    | "same_profession"
    | "different_profession"
    | "open_to_anyone"
    | null
  sessionGoal: string | null
}

export interface ResolvedLocationData {
  country: string
  countryCode: string
  region: string | null
  regionCode: string | null
  city: string | null
  latitude: number
  longitude: number
}

export interface ResolvedLocationSuggestionData extends ResolvedLocationData {
  placeId: string
  label: string
  primaryText?: string
  secondaryText?: string
}

/** GET /profile/me — canonical type: `@/features/profile/types/my-profile.types` */
export type { MyProfileResponse } from "@/features/profile/types/my-profile.types";
