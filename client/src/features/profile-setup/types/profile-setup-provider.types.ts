export interface ProfileSetupProvider {
  currentStep: number
  totalSteps: number
  currentStepData: any
  onContinue: () => Promise<void>
  onBack: () => void
  isLastStep: boolean
  isFirstStep: boolean
  isLoading: boolean
  isSaving: boolean
  allFormData: Record<string, any>
}