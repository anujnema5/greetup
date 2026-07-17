'use client'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Resolver, FieldValues } from 'react-hook-form'
import type { ProfileSetupProvider as TProfileSetupProvider } from '../types'
import type { ProfileSetupField, ProfileSetupStep } from '../types/profile-setup-api.types'
import { getSessionIsOnboarded } from '@/features/auth/lib/session-user'
import { guestTrialLandingPath } from '@/features/auth/lib/app-route-guards'
import { useGuestTryStatus } from '@/features/guest-try/hooks/use-guest-try-status'
import { getApiErrorCode } from '@/lib/api'
import { useSession } from '@/lib/auth-client'
import {
  useProfileSetupSteps,
  useSaveProfileSetup,
} from '../api'
import { useForm, FormProvider } from 'react-hook-form'
import {
  generateStepSchema,
  getStepDefaultValues,
  normalizeStoredFormData,
  parseProfileSetupSaveError,
  transformStepToApiPayload,
} from '../utils'
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

function getStoredFormData(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_SETUP_DATA_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

function isFieldCompleted(field: ProfileSetupField): boolean {
  const value = field?.value

  if (field?.type === 'country-select') {
    if (!value || typeof value !== 'object') return false
    const country = value as { code?: string; name?: string }
    return !!country.code && !!country.name
  }

  if (field?.type === 'photo-upload') {
    return Array.isArray(value) && value.length > 0
  }

  return hasMeaningfulValue(value)
}

function getFirstIncompleteRequiredStep(steps: ProfileSetupStep[]): number | null {
  for (const step of steps) {
    const requiredFields = (step.fields ?? []).filter((field) => field?.required)
    if (requiredFields.length === 0) continue

    const allRequiredCompleted = requiredFields.every(isFieldCompleted)
    if (!allRequiredCompleted) {
      return step.step
    }
  }

  return null
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, isPending: sessionPending } = useSession()
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: !sessionPending && Boolean(session),
  })
  const isGuest = guestStatus?.isGuest === true
  const canLoadSteps =
    !sessionPending && !guestPending && Boolean(session) && !isGuest
  const { data, isLoading, isError, error, refetch } = useProfileSetupSteps({
    enabled: canLoadSteps,
  })
  const { mutateAsync: saveProfileSetup, isPending: isSaving } = useSaveProfileSetup()

  useEffect(() => {
    if (sessionPending || guestPending) return
    if (isGuest) {
      router.replace(guestTrialLandingPath(guestStatus?.trialConsumed === true))
      return
    }
    if (getSessionIsOnboarded(session)) {
      router.replace('/home')
    }
  }, [session, sessionPending, guestPending, isGuest, guestStatus?.trialConsumed, router])

  const stepsLoadError =
    isGuest
      ? 'guest'
      : isError
        ? getApiErrorCode(error) === 'GUEST_NOT_ALLOWED'
          ? 'guest'
          : 'failed'
        : null

  useEffect(() => {
    if (stepsLoadError === 'guest') {
      router.replace('/try')
    }
  }, [stepsLoadError, router])

  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState<ProfileSetupStep[]>([])
  const [allFormData, setAllFormData] = useState<Record<string, unknown>>({})
  const [isInitialized, setIsInitialized] = useState(false)
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

  /** RHF keeps the first resolver; point at the latest Zod schema per step. */
  const stepSchemaRef = useRef<z.ZodTypeAny>(currentStepSchema)

  useLayoutEffect(() => {
    stepSchemaRef.current = currentStepSchema
  }, [currentStepSchema])

  const dynamicResolver = useMemo(
    () =>
      (async (values, context, options) =>
        zodResolver(stepSchemaRef.current as never)(values, context, options)) as Resolver<FieldValues>,
    [],
  )

  const methods = useForm<FieldValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    shouldFocusError: true,
    resolver: dynamicResolver,
    defaultValues: allFormData,
  })

  // Initialize steps and form data once; restore from localStorage if available
  useEffect(() => {
    if (data?.steps && !isInitialized) {
      const fetchedSteps = data.steps
      queueMicrotask(() => {
        setSteps(fetchedSteps)

        // Build initial form data from API defaults
        const initialData: Record<string, unknown> = {}
        fetchedSteps.forEach((step: ProfileSetupStep) => {
          const stepDefaults = getStepDefaultValues(step.fields)
          Object.assign(initialData, stepDefaults)
        })

        // Restore saved progress if valid
        const storedStep = getStoredStep()
        const storedData = getStoredFormData()
        const totalSteps = fetchedSteps.length
        const stepFromQuery = Number(searchParams.get('step'))
        const hasQueryStep =
          Number.isInteger(stepFromQuery) &&
          stepFromQuery >= 1 &&
          stepFromQuery <= totalSteps
        const inferredStepFromServer = getFirstIncompleteRequiredStep(fetchedSteps)
        const preferredStep =
          hasQueryStep
            ? stepFromQuery
            : inferredStepFromServer ?? 1
        const validStep =
          storedStep != null &&
          Number.isInteger(storedStep) &&
          storedStep >= 1 &&
          storedStep <= totalSteps

        if (validStep && storedData && typeof storedData === 'object') {
          // Keep users on the furthest valid step we've seen locally/server-side.
          setCurrentStep(Math.max(storedStep, preferredStep))
          setAllFormData({
            ...initialData,
            ...normalizeStoredFormData(storedData, fetchedSteps),
          })
        } else {
          setCurrentStep(preferredStep)
          setAllFormData(initialData)
        }
        setIsInitialized(true)
      })
    }
  }, [data, isInitialized, searchParams])

  // Update form when step changes
  useEffect(() => {
    if (currentStepData && isInitialized) {
      const stepDefaults = getStepDefaultValues(currentStepData.fields)
      const currentValues = { ...stepDefaults, ...allFormData }
      methods.reset(currentValues)
    }
  }, [currentStepData, currentStep, isInitialized, allFormData, methods])

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

  const onContinue = useCallback(async (options?: { skipOptionalPromptValidation?: boolean }) => {
    if (!currentStepData) return

    methods.clearErrors('root')

    if (options?.skipOptionalPromptValidation) {
      for (const field of currentStepData.fields ?? []) {
        if (field.type !== 'textarea' || field.required) continue
        const val = String(methods.getValues(field.key) ?? '').trim()
        const minLength =
          'minLength' in field && typeof field.minLength === 'number'
            ? field.minLength
            : undefined
        if (val.length > 0 && minLength && val.length < minLength) {
          methods.setValue(field.key, '', { shouldValidate: false })
        }
      }
      methods.clearErrors()
    } else {
      const isValid = await methods.trigger(undefined, { shouldFocus: true })
      if (!isValid) return
    }

    const currentValues = methods.getValues()
    const updatedData = { ...allFormData, ...currentValues }
    setAllFormData(updatedData)

    try {
      const payload = transformStepToApiPayload(currentStep, updatedData)
      await saveProfileSetup(payload)

      if (currentStep === steps.length) {
        clearProfileSetupProgress()
        router.push('/home')
      } else {
        setCurrentStep((prev) => prev + 1)
      }
    } catch (error) {
      const { message, code, fieldErrors } = parseProfileSetupSaveError(error)
      let appliedToField = false

      for (const { name, message: msg } of fieldErrors) {
        methods.setError(name, { type: 'server', message: msg })
        appliedToField = true
      }

      if (code === 'USERNAME_TAKEN') {
        methods.setError('username', { type: 'server', message })
        appliedToField = true
        const usernameStep = steps.find((s) =>
          s.fields?.some((f) => f.key === 'username'),
        )
        if (usernameStep && usernameStep.step !== currentStep) {
          setCurrentStep(usernameStep.step)
        }
      }

      if (appliedToField) {
        const focusName =
          fieldErrors[0]?.name ?? (code === 'USERNAME_TAKEN' ? 'username' : null)
        if (focusName) {
          requestAnimationFrame(() => methods.setFocus(focusName as never))
        }
      } else {
        methods.setError('root', { type: 'server', message })
      }
    }
  }, [
    currentStepData,
    currentStep,
    steps.length,
    allFormData,
    methods,
    saveProfileSetup,
    router,
    steps,
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
        isLoading:
          guestPending ||
          isGuest ||
          stepsLoadError === 'guest' ||
          ((isLoading || !isInitialized) && !stepsLoadError),
        stepsLoadError,
        retryLoadSteps: () => {
          void refetch()
        },
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
