'use client'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
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

const PROFILE_SETUP_STEP_KEY = 'profile-setup-current-step'
const PROFILE_SETUP_DATA_KEY = 'profile-setup-form-data'

function getStoredStep(): number | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_SETUP_STEP_KEY)
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isNaN(n) ? null : n
}

function getStoredFormData(): Record<string, any> | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_SETUP_DATA_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, any>
  } catch {
    return null
  }
}

export function clearProfileSetupProgress(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PROFILE_SETUP_STEP_KEY)
  localStorage.removeItem(PROFILE_SETUP_DATA_KEY)
}

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
  const router = useRouter()
  const persistRef = useRef<() => void>(() => {})

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

  // Initialize steps and form data once; restore from localStorage if available
  useEffect(() => {
    if (data?.data?.steps && !isInitialized) {
      const fetchedSteps = data.data.steps
      setSteps(fetchedSteps)

      // Build initial form data from API defaults
      const initialData: Record<string, any> = {}
      fetchedSteps.forEach((step: any) => {
        const stepDefaults = getStepDefaultValues(step.fields)
        Object.assign(initialData, stepDefaults)
      })

      // Restore saved progress if valid
      const storedStep = getStoredStep()
      const storedData = getStoredFormData()
      const totalSteps = fetchedSteps.length
      const validStep =
        storedStep != null &&
        Number.isInteger(storedStep) &&
        storedStep >= 1 &&
        storedStep <= totalSteps

      if (validStep && storedData && typeof storedData === 'object') {
        setCurrentStep(storedStep)
        setAllFormData({ ...initialData, ...storedData })
      } else {
        setAllFormData(initialData)
      }
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

  // Persist current step and form data to localStorage
  const persistProgress = useCallback(() => {
    if (!isInitialized || steps.length === 0) return
    const formData = { ...allFormData, ...methods.getValues() }
    try {
      localStorage.setItem(PROFILE_SETUP_STEP_KEY, String(currentStep))
      localStorage.setItem(PROFILE_SETUP_DATA_KEY, JSON.stringify(formData))
    } catch {
      // Ignore quota / parse errors
    }
  }, [currentStep, allFormData, isInitialized, steps.length, methods])

  // Persist on step/form data change
  useEffect(() => {
    persistProgress()
  }, [currentStep, allFormData, persistProgress])

  // Persist on beforeunload (user leaves without clicking Next)
  useEffect(() => {
    persistRef.current = persistProgress
  }, [persistProgress])

  useEffect(() => {
    const onBeforeUnload = () => {
      persistRef.current()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

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
        // Last step completed – clear stored progress and go to dashboard
        clearProfileSetupProgress()
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
