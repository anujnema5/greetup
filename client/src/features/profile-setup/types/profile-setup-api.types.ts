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

/** GET /profile/onboarding-status */
export interface OnboardingStatusResponse {
  success: boolean
  data: { isOnboarded: boolean }
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
// 💡 This unlocks perfect switch-case rendering later.
export interface ProfileSetupFieldBase {
  key: string
  name: string
  label: string
  type: FieldType
  value: unknown
  required?: boolean
  placeholder?: string
}

// Extended field types for specific input variations
export interface TextField extends ProfileSetupFieldBase {
  type: 'text' | 'textarea'
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

// Union type for all possible field types
export type ProfileSetupField =
  | TextField
  | NumberField
  | SelectField
  | RangeField
  | ToggleField
  | PhotoUploadField

export interface ProfileSetupStep {
  step: number
  title: string
  optional?: boolean
  fields: ProfileSetupField[]
}

export interface ProfileSetupData {
  steps: ProfileSetupStep[]
  profileCompletion: number
  isProfileComplete: boolean
}

export type ProfileSetupApiResponse = ApiResponse<ProfileSetupData>

/** Save profile setup response (per-step) */
export interface SaveProfileSetupResponse {
  profileCompletion: number
  isProfileComplete: boolean
}

export type SaveProfileSetupApiResponse = ApiResponse<SaveProfileSetupResponse>

/** Payload for POST /profile-setup - discriminated by step */
export type SaveProfileSetupPayload =
  | { step: 1; data: { displayName: string; age: number; gender: string; country: { code: string; name: string } } }
  | { step: 2; data: { goals: Array<{ id: string }> } }
  | { step: 3; data: { interests: Array<{ id: string }> } }
  | { step: 4; data: { profession: { id: string; name?: string; category?: string } | null } }
  | { step: 5; data: { preferredGender?: string; distancePreference?: string; ageRange?: { min: number; max: number } } }
  | { step: 6; data: { bio?: string; photos?: Array<{ url: string; order?: number }> } }

/** GET /profile/me — canonical type: `@/features/profile/types/my-profile.types` */
export type { MyProfileResponse } from "@/features/profile/types/my-profile.types";
