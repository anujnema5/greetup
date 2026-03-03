'use client'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useRouter } from 'next/navigation'
import type { ProfileSetupProvider as TProfileSetupProvider } from '../types'
import {
  useGetProfileSetupStepsQuery,
  useSaveProfileSetupMutation,
} from '../components/profile-setup-api'
import { useForm, FormProvider } from 'react-hook-form'
import {
  generateStepSchema,
  getStepDefaultValues,
} from '../utils/generate-step-schema'
import { transformStepToApiPayload } from '../utils/transform-step-to-api'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export interface ProfileSetupProviderProps {
  children: React.ReactNode
}

const ProfileSetupContext = createContext<TProfileSetupProvider | null>(null)

export const ProfileSetupProvider: React.FC<ProfileSetupProviderProps> = ({
  children,
}) => {
  const { data, isLoading } = useGetProfileSetupStepsQuery()
  const [saveProfileSetup, { isPending: isSaving }] = useSaveProfileSetupMutation()

  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState<any[]>([])
  const [allFormData, setAllFormData] = useState<Record<string, any>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter();

  // Get current step data
  const currentStepData = useMemo(
    () => steps[currentStep - 1],
    [steps, currentStep],
  )

  // Generate schema for current step
  const currentStepSchema = useMemo(() => {
    if (!currentStepData) return z.any()
    return generateStepSchema(currentStepData.fields)
  }, [currentStepData])

  // Initialize form with resolver for current step
  const methods = useForm({
    mode: 'onChange',
    resolver: zodResolver(currentStepSchema),
    defaultValues: allFormData,
  })

  // Initialize steps and form data once
  useEffect(() => {
    if (data?.data?.steps && !isInitialized) {
      const fetchedSteps = data.data.steps
      setSteps(fetchedSteps)

      // Build initial form data with proper defaults
      const initialData: Record<string, any> = {}
      fetchedSteps.forEach((step: any) => {
        const stepDefaults = getStepDefaultValues(step.fields)
        Object.assign(initialData, stepDefaults)
      })

      setAllFormData(initialData)
      setIsInitialized(true)
    }
  }, [data, isInitialized])

  // Update form when step changes
  useEffect(() => {
    if (currentStepData && isInitialized) {
      // Get default values for current step
      const stepDefaults = getStepDefaultValues(currentStepData.fields)

      // Merge with existing data
      const currentValues = { ...stepDefaults, ...allFormData }

      methods.reset(currentValues)
    }
  }, [currentStepData, currentStep, isInitialized])

  const onContinue = useCallback(async () => {
    if (!currentStepData) return

    // Trigger validation
    const isValid = await methods.trigger()

    if (!isValid) {
      // Validation failed, errors are already set by react-hook-form
      return
    }

    // Get current form values and merge with all form data
    const currentValues = methods.getValues()
    const updatedData = { ...allFormData, ...currentValues }
    setAllFormData(updatedData)

    try {
      const payload = transformStepToApiPayload(currentStep, updatedData)
      const result = await saveProfileSetup(payload).unwrap()

      if (currentStep === steps.length) {
        // Last step completed – go to dashboard
        const destination = '/'
        router.push(destination)
      } else {
        setCurrentStep((prev) => prev + 1)
      }
    } catch (error) {
      console.error('Failed to save profile step:', error)
      // RTK Query throws on error; you can show toast/alert here
    }
  }, [
    currentStepData,
    currentStep,
    steps.length,
    allFormData,
    methods,
    saveProfileSetup,
  ])

  const onBack = useCallback(() => {
    if (currentStep > 1) {
      // Save current step data before going back
      const currentValues = methods.getValues()
      setAllFormData((prev) => ({ ...prev, ...currentValues }))

      // Move to previous step
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep, methods])

  return (
    <ProfileSetupContext.Provider
      value={{
        currentStep,
        totalSteps: steps.length,
        currentStepData,
        onContinue,
        onBack,
        isLastStep: currentStep === steps.length,
        isFirstStep: currentStep === 1,
        isLoading: isLoading || !isInitialized,
        isSaving,
        allFormData,
      }}
    >
      <FormProvider {...methods}>{children}</FormProvider>
    </ProfileSetupContext.Provider>
  )
}

export const useProfileSetup = () => {
  const context = useContext(ProfileSetupContext)
  if (!context) {
    throw new Error('useProfileSetup must be used within ProfileSetupProvider')
  }
  return context
}
