import type { ProfileSetupStep } from './profile-setup-api.types'

export interface ProfileSetupProvider {
  currentStep: number
  totalSteps: number
  currentStepData: ProfileSetupStep | undefined
  onContinue: () => Promise<void>
  onBack: () => void
  isLastStep: boolean
  isFirstStep: boolean
  isLoading: boolean
  isSaving: boolean
  allFormData: Record<string, unknown>
}