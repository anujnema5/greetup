import type { ProfileSetupStep } from './profile-setup-api.types'

export interface ProfileSetupContinueOptions {
  /** Skip Zod validation for optional steps (e.g. skip all profile prompts). */
  skipOptionalPromptValidation?: boolean
}

export interface ProfileSetupProvider {
  currentStep: number
  totalSteps: number
  currentStepData: ProfileSetupStep | undefined
  onContinue: (options?: ProfileSetupContinueOptions) => Promise<void>
  onBack: () => void
  isLastStep: boolean
  isFirstStep: boolean
  isLoading: boolean
  isSaving: boolean
  allFormData: Record<string, unknown>
}