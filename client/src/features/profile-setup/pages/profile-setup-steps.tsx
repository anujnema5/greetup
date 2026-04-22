'use client'
import { useFormContext, useFormState } from 'react-hook-form'
import { useRouter } from 'next/navigation'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'
import ReactCountryFlag from 'react-country-flag'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProfileSetup, clearProfileSetupProgress } from '../provider'
import { firstLetterCapital } from '@/shared/utils/general'
import { LogOut } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { ThemeToggle } from '@/components/theme-toggle'
import { CountryDropdown, type Country } from '@/components/ui/country-dropdown'
import { AgeDigitsInput } from '@/features/profile/components/age-digits-input'
import { generateKey } from '../utils'

/** Fallback emoji when backend doesn't send one (e.g. legacy data). */
const DEFAULT_OPTION_EMOJI = '✨'

const Logo = ({ className }: { className?: string }) => {
  return (
    <div
      className={`flex items-center gap-3 font-bold tracking-tight ${className}`}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
        <span className="text-lg font-black leading-none tracking-[-0.03em]" aria-hidden>
          G
        </span>
      </div>
      <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
        Greetup
      </span>
    </div>
  )
}

const ProfileSetupStep = () => {
  const router = useRouter()
  const {
    currentStepData,
    onContinue,
    onBack,
    isFirstStep,
    isLastStep,
    currentStep,
    totalSteps,
    isLoading,
    isSaving,
  } = useProfileSetup()

  const form = useFormContext()
  const { errors: formErrors } = useFormState({ control: form.control })
  const rootErrorMessage =
    typeof formErrors.root?.message === 'string' ? formErrors.root.message : undefined

  const handleLogout = async () => {
    clearProfileSetupProgress()
    await signOut()
    router.push('/login')
  }

  if (isLoading || !currentStepData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  const renderField = (field: any) => {
    switch (field.type) {
      case 'text':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value || ''}
                    {...(field.autoComplete
                      ? { autoComplete: field.autoComplete }
                      : {})}
                    className="border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20 "
                  />
                </FormControl>
                {field.description ? (
                  <FormDescription className="text-xs text-muted-foreground">
                    {field.description}
                  </FormDescription>
                ) : null}
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )

      case 'number':
        if (field.key === 'age') {
          return (
            <FormField
              control={form.control}
              name={field.key}
              render={({ field: formField }) => {
                const num =
                  typeof formField.value === 'number' && !Number.isNaN(formField.value)
                    ? formField.value
                    : typeof formField.value === 'string' && formField.value !== ''
                      ? Number(formField.value)
                      : field.min ?? 18
                const v = Number.isFinite(num) ? num : (field.min ?? 18)
                return (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">
                      {field.label}
                      {field.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <AgeDigitsInput
                        id={`setup-${field.key}`}
                        min={field.min ?? 18}
                        max={field.max ?? 99}
                        value={v}
                        onChange={(n) => formField.onChange(n)}
                        onBlur={formField.onBlur}
                        className="border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )
              }}
            />
          )
        }
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    {...formField}
                    value={formField.value || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      formField.onChange(value === '' ? '' : Number(value))
                    }}
                    className="border-input  bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )

      case 'select':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => {
              // Handle both string arrays and object arrays
              const getOptionValue = (option: any) => {
                if (typeof option === 'string') return option
                return option.id || option.name || option.code || String(option)
              }

              const getOptionLabel = (option: any) => {
                if (typeof option === 'string')
                  return firstLetterCapital(option)
                return option.name || option.label || String(option)
              }

              return (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-foreground">
                    {field.label}
                    {field.required && (
                      <span className="text-destructive">*</span>
                    )}
                  </FormLabel>
                  <Select
                    onValueChange={formField.onChange}
                    value={formField.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger className="border-input w-full bg-background   transition-all hover:border-primary/50 focus:ring-primary/20">
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {field?.options?.map((option: any) => {
                        const value = getOptionValue(option)
                        const label = getOptionLabel(option)
                        return (
                          <SelectItem
                            key={value}
                            value={value}
                            className="cursor-pointer"
                          >
                            {label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )
            }}
          />
        )

      case 'multi-select':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => {
              const getOptionValue = (option: any) => {
                if (typeof option === 'string') return option
                return option.id || option.name || String(option)
              }

              const getOptionLabel = (option: any) => {
                if (typeof option === 'string')
                  return firstLetterCapital(option)
                return option.name || option.label || String(option)
              }

              const isChecked = (option: any) => {
                const value = getOptionValue(option)
                return (formField.value || []).includes(value)
              }

              const toggleOption = (option: any) => {
                const value = getOptionValue(option)
                const currentValues = formField.value || []

                if (currentValues.includes(value)) {
                  formField.onChange(
                    currentValues.filter((v: string) => v !== value),
                  )
                } else {
                  if (field.max && currentValues.length >= field.max) return
                  formField.onChange([...currentValues, value])
                }
              }

              return (
                <FormItem className="space-y-4">
                  <div>
                    <FormLabel className="text-sm font-semibold">
                      {field.label}
                      {field.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </FormLabel>

                    {field.max && (
                      <FormDescription className="text-xs">
                        Select up to {field.max}
                        {formField.value?.length
                          ? ` (${formField.value.length} selected)`
                          : ''}
                      </FormDescription>
                    )}
                  </div>

                  {/* CARD GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(field.options ?? []).length === 0 ? (
                      <p className="col-span-full text-sm text-muted-foreground py-4 text-center">
                        No options available right now. Please refresh the page or try again later.
                      </p>
                    ) : (field.options ?? []).map((option: any, index: number) => {
                      const value = getOptionValue(option)
                      const label = getOptionLabel(option)
                      const checked = isChecked(option)

                      return (
                        <div
                          key={value}
                          role="button"
                          onClick={() => toggleOption(option)}
                          className={cn(
                            'relative flex flex-col items-center justify-center gap-3 rounded-xl border p-5 text-center transition-all cursor-pointer',
                            checked
                              ? 'border-primary bg-accent shadow-sm'
                              : 'border-border hover:border-primary/50 hover:bg-muted/40',
                            field.max &&
                              !checked &&
                              formField.value?.length >= field.max &&
                              'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {/* Hidden checkbox (state control only) */}
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleOption(option)}
                            className="hidden"
                          />

                          {/* Emoji from backend (no static images) */}
                          <div className="flex h-12 w-12 items-center justify-center text-3xl" aria-hidden>
                            {option.emoji ?? DEFAULT_OPTION_EMOJI}
                          </div>

                          {/* Title - dark text when selected for contrast on light accent bg (light/dark mode) */}
                          <span
                            className={cn(
                              'text-sm font-medium',
                              checked && '!text-[#1a1a1a]',
                            )}
                          >
                            {label}
                          </span>

                          {/* Selected indicator */}
                          {checked && (
                            <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <FormMessage className="text-xs" />
                </FormItem>
              )
            }}
          />
        )

      case 'textarea':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => {
              const autoResize = (el: HTMLTextAreaElement | null) => {
                if (!el) return
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }

              return (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-foreground">
                    {field.label}
                    {field.required && (
                      <span className="text-destructive">*</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={field.placeholder}
                      {...formField}
                      ref={(el) => {
                        formField.ref(el)
                        autoResize(el)
                      }}
                      value={formField.value || ''}
                      maxLength={field.maxLength}
                      onInput={(e) => autoResize(e.currentTarget)}
                      className="min-h-13 resize-none overflow-hidden border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                    />
                  </FormControl>
                  {field.maxLength && (
                    <FormDescription className="text-xs text-muted-foreground text-right">
                      {formField.value?.length || 0}/{field.maxLength} characters
                    </FormDescription>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )
            }}
          />
        )

      case 'radio':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-sm font-semibold text-foreground">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={formField.onChange}
                    value={formField.value || ''}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {field?.options?.map((option: any) => {
                      const value =
                        typeof option === 'string'
                          ? option
                          : option.value || option.id
                      const label =
                        typeof option === 'string'
                          ? option
                          : option.label || option.name

                      return (
                        <div
                          key={value}
                          className="flex items-center space-x-3 rounded-lg border border-input bg-background p-4 transition-all hover:border-primary/50 hover:bg-accent/50 cursor-pointer"
                        >
                          <RadioGroupItem
                            value={value}
                            id={`${field.key}-${value}`}
                            className="border-primary text-primary"
                          />
                          <label
                            htmlFor={`${field.key}-${value}`}
                            className="flex-1 cursor-pointer text-sm font-medium leading-none"
                          >
                            {firstLetterCapital(label)}
                          </label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )

      case 'toggle':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-input bg-background p-4 transition-all hover:border-primary/50 hover:bg-accent/30">
                <div className="space-y-1 pr-4">
                  <FormLabel className="text-sm font-semibold text-foreground">
                    {field.label}
                  </FormLabel>
                  {field.description && (
                    <FormDescription className="text-xs text-muted-foreground">
                      {field.description}
                    </FormDescription>
                  )}
                </div>
                <FormControl>
                  <Switch
                    checked={formField.value || false}
                    onCheckedChange={formField.onChange}
                    className="data-[state=checked]:bg-primary"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )

      case 'country-select':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-foreground">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <CountryDropdown
                    placeholder={field.placeholder}
                    defaultValue={formField.value?.code}
                    onChange={(country: Country) => {
                      formField.onChange({
                        code: country.alpha3,
                        name: country.name,
                      })
                    }}
                    disabled={false}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  const getFieldGridClass = (field: any) => {
    if (['multi-select', 'textarea', 'radio', 'toggle'].includes(field.type)) {
      return 'col-span-full'
    }
    return 'col-span-full md:col-span-1'
  }

  const progressPercent = totalSteps ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6 sm:py-8">
      <div className="w-full max-w-2xl">
        {/* Card container */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Progress bar - top of card */}
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8">
            {/* Logo row with theme toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <Logo className="scale-90 sm:scale-100" />
              <div className="flex-1 flex justify-end">
                <ThemeToggle />
              </div>
            </div>

            {/* Step label */}
            <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Step {currentStep} of {totalSteps}
            </p>

            {/* Heading */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {currentStepData.title}
              </h1>
              {currentStepData.description && (
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {currentStepData.description}
                </p>
              )}
            </div>

            {/* Form */}
            <Form {...form}>
              <div className="space-y-5 sm:space-y-6">
                {currentStepData.fields.map((field: any) => (
                  <div key={field.key}>{renderField(field)}</div>
                ))}
              </div>
            </Form>

            {rootErrorMessage ? (
              <Alert variant="destructive" className="text-left">
                <AlertDescription>{rootErrorMessage}</AlertDescription>
              </Alert>
            ) : null}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={onBack}
                disabled={isFirstStep || isSaving}
                className="text-muted-foreground min-w-0"
              >
                Back
              </Button>
              <Button
                onClick={onContinue}
                disabled={isSaving}
                className="min-w-[120px] sm:min-w-[140px]"
              >
                {isSaving ? 'Saving...' : isLastStep ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalSteps }).map((_, index) => {
            const step = index + 1
            return (
              <span
                key={step}
                className={cn(
                  'h-1 w-6 sm:w-8 rounded-full transition-all',
                  step === currentStep && 'bg-primary scale-110',
                  step < currentStep && 'bg-primary/70',
                  step > currentStep && 'bg-muted',
                )}
              />
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 mt-4 pb-2">
          <p className="text-center text-xs text-muted-foreground">
            All your information is secure and private
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetupStep
