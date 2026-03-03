'use client'
import { useFormContext } from 'react-hook-form'
import Image from 'next/image'
import CC from '../../../../public/assets/casualchat.png'
import dating from '../../../../public/assets/dating.png'
import friends from '../../../../public/assets/friends.png'
import idea from '../../../../public/assets/idea.png'
import networking from '../../../../public/assets/networking.png'
import practiceLang from '../../../../public/assets/pl.png'

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
import { useProfileSetup } from '../provider'
import { firstLetterCapital } from '@/shared/utils/general'
import { CheckCircle2, Circle, Sparkles } from 'lucide-react'
import { CountryDropdown, type Country } from '@/components/ui/country-dropdown'
import { generateKey } from '../utils'
const OPTION_IMAGES = [
  CC, // Casual chat
  dating, // Dating
  friends, // Make friends
  networking, // Networking
  practiceLang, // Practice a language
  idea, // Share ideas
]

const Logo = ({ className }: { className?: string }) => {
  return (
    <div
      className={`flex items-center gap-3 font-bold tracking-tight ${className}`}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
        <span className="text-lg font-extrabold">VR</span>
        <div className="absolute -right-1 -top-1">
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        </div>
      </div>
      <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
        Circlo
      </span>
    </div>
  )
}

const ProfileSetupStep = () => {
  const {
    currentStepData,
    onContinue,
    onBack,
    isFirstStep,
    isLastStep,
    currentStep,
    totalSteps,
    isLoading,
  } = useProfileSetup()

  const form = useFormContext()

  if (isLoading || !currentStepData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
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
                    className="border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20 "
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )

      case 'number':
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
                    {field.options?.map((option: any, index: number) => {
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

                          {/* Emoji / Icon */}
                          {/* {option.emoji && (
                            <div className="text-3xl">{option.emoji}</div>
                          )} */}
                          <div className="h-12 w-12 flex items-center justify-center">
                            <Image
                              src={OPTION_IMAGES[index] ?? CC}
                              alt={label}
                              className="object-contain"
                              priority
                            />
                          </div>

                          {/* Title */}
                          <span className="text-sm font-medium">{label}</span>

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
            render={({ field: formField }) => (
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
                    value={formField.value || ''}
                    maxLength={field.maxLength}
                    className="min-h-[120px] resize-none border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </FormControl>
                {field.maxLength && (
                  <FormDescription className="text-xs text-muted-foreground text-right">
                    {formField.value?.length || 0}/{field.maxLength} characters
                  </FormDescription>
                )}
                <FormMessage className="text-xs" />
              </FormItem>
            )}
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl space-y-4">
        {/* Logo */}
        <div className="flex justify-center mt-4">
          <Logo />
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground uppercase">
            {currentStepData.title}
          </h1>
          {currentStepData.description && (
            <p className="text-muted-foreground text-sm">
              {currentStepData.description}
            </p>
          )}
        </div>

        {/* Form */}
        <Form {...form}>
          <div className="space-y-4">
            {currentStepData.fields.map((field: any) => (
              <div key={field.key}>{renderField(field)}</div>
            ))}
          </div>
        </Form>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isFirstStep}
            className="text-muted-foreground"
          >
            Back
          </Button>

          <Button onClick={onContinue} className="px-4 text-xs">
            {isLastStep ? 'Complete' : 'Next'}
          </Button>
        </div>

        {/* Progress Dots (ElevenLabs style) */}

        <div className="flex flex-col items-center gap-2">
          {/* Optional percentage text */}
          <span
            className="
    text-black
    bg-primary
    text-center
    text-xs
    font-semibold
    px-10 
    flex
    rounded-full
    items-center
    justify-center
    shadow
    "
          >
            {Math.round((currentStep / totalSteps) * 100)}%
          </span>

          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const step = index + 1
              return (
                <span
                  key={step}
                  className={`h-0.5 w-3 rounded-t-full transition-all ${
                    step === currentStep
                      ? 'bg-foreground scale-125'
                      : step < currentStep
                        ? 'bg-foreground/60'
                        : 'bg-muted'
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          All your information is secure and private
        </p>
      </div>
    </div>
  )
}

export default ProfileSetupStep
