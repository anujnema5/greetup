"use client"
import { useFormContext } from "react-hook-form";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfileSetup } from "../provider";
import { firstLetterCapital } from "@/shared/utils/general";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { CountryDropdown, type Country } from "@/components/ui/country-dropdown";
import { generateKey } from "../utils";

const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={`flex items-center gap-3 font-bold tracking-tight ${className}`}>
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
    );
};

const ProfileSetupStep = () => {
    const {
        currentStepData,
        onContinue,
        onBack,
        isFirstStep,
        isLastStep,
        currentStep,
        totalSteps,
        isLoading
    } = useProfileSetup();

    const form = useFormContext();

    if (isLoading || !currentStepData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <div className="text-muted-foreground">Loading...</div>
                </div>
            </div>
        );
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
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        type="text"
                                        placeholder={field.placeholder}
                                        {...formField}
                                        value={formField.value || ''}
                                        className="border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                );

            case 'number':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold text-foreground">
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
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
                                            const value = e.target.value;
                                            formField.onChange(value === '' ? '' : Number(value));
                                        }}
                                        className="border-input bg-background transition-all hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20"
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                );

            case 'select':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => {
                            // Handle both string arrays and object arrays
                            const getOptionValue = (option: any) => {
                                if (typeof option === 'string') return option;
                                return option.id || option.name || option.code || String(option);
                            };

                            const getOptionLabel = (option: any) => {
                                if (typeof option === 'string') return firstLetterCapital(option);
                                return option.name || option.label || String(option);
                            };

                            return (
                                <FormItem>
                                    <FormLabel className="text-sm font-semibold text-foreground">
                                        {field.label}
                                        {field.required && <span className="text-destructive ml-1">*</span>}
                                    </FormLabel>
                                    <Select
                                        onValueChange={formField.onChange}
                                        value={formField.value || ''}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="border-input w-full bg-background transition-all hover:border-primary/50 focus:ring-primary/20">
                                                <SelectValue placeholder={field.placeholder} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {field?.options?.map((option: any) => {
                                                const value = getOptionValue(option);
                                                const label = getOptionLabel(option);
                                                return (
                                                    <SelectItem
                                                        key={value}
                                                        value={value}
                                                        className="cursor-pointer"
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            );
                        }}
                    />
                );

            case 'multi-select':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => {
                            const getOptionValue = (option: any) => {
                                if (typeof option === 'string') return option;
                                return option.id || option.name || String(option);
                            };

                            const getOptionLabel = (option: any) => {
                                if (typeof option === 'string') return firstLetterCapital(option);
                                return option.name || option.interest || option.label || String(option);
                            };

                            const isChecked = (option: any) => {
                                const value = getOptionValue(option);
                                const currentValues = formField.value || [];
                                return currentValues.includes(value);
                            };

                            return (
                                <FormItem className="space-y-3">
                                    <div className="space-y-1">
                                        <FormLabel className="text-sm font-semibold text-foreground">
                                            {field.label}
                                            {field.required && <span className="text-destructive ml-1">*</span>}
                                        </FormLabel>
                                        {field.max && (
                                            <FormDescription className="text-xs text-muted-foreground">
                                                Select up to {field.max} options
                                                {formField.value?.length > 0 && ` (${formField.value.length} selected)`}
                                            </FormDescription>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-input bg-muted/30 p-4 max-h-[400px] overflow-y-auto">
                                        {field?.options?.map((option: any) => {
                                            const value = getOptionValue(option);
                                            const label = getOptionLabel(option);
                                            const checked = isChecked(option);

                                            return (
                                                <div
                                                    key={value}
                                                    className="flex items-center space-x-3 rounded-md border border-border bg-background p-3 transition-all hover:border-primary/50 hover:bg-accent/50"
                                                >
                                                    <Checkbox
                                                        id={`${field.key}-${value}`}
                                                        checked={checked}
                                                        onCheckedChange={(isChecked) => {
                                                            const currentValues = formField.value || [];
                                                            
                                                            if (isChecked) {
                                                                // Check max limit
                                                                if (field.max && currentValues.length >= field.max) {
                                                                    return;
                                                                }
                                                                formField.onChange([...currentValues, value]);
                                                            } else {
                                                                formField.onChange(
                                                                    currentValues.filter((val: string) => val !== value)
                                                                );
                                                            }
                                                        }}
                                                        disabled={field.max && !checked && formField.value?.length >= field.max}
                                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                    />
                                                    <label
                                                        htmlFor={`${field.key}-${value}`}
                                                        className="flex-1 text-sm font-medium leading-none cursor-pointer select-none"
                                                    >
                                                        {label}
                                                        {option.emoji && <span className="ml-2">{option.emoji}</span>}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            );
                        }}
                    />
                );

            case 'textarea':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold text-foreground">
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
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
                );

            case 'radio':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => (
                            <FormItem className="space-y-3">
                                <FormLabel className="text-sm font-semibold text-foreground">
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={formField.onChange}
                                        value={formField.value || ''}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                    >
                                        {field?.options?.map((option: any) => {
                                            const value = typeof option === 'string' ? option : option.value || option.id;
                                            const label = typeof option === 'string' ? option : option.label || option.name;
                                            
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
                                            );
                                        })}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                );

            case 'toggle':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border border-input bg-background p-4 transition-all hover:border-primary/50 hover:bg-accent/30">
                                <div className="space-y-1 pr-4">
                                    <FormLabel className="text-sm font-semibold text-foreground">{field.label}</FormLabel>
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
                );

            case 'country-select':
                return (
                    <FormField
                        control={form.control}
                        name={field.key}
                        render={({ field: formField }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold text-foreground">
                                    {field.label}
                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                    <CountryDropdown
                                        placeholder={field.placeholder}
                                        defaultValue={formField.value?.code}
                                        onChange={(country: Country) => {
                                            formField.onChange({
                                                code: country.alpha3,
                                                name: country.name,
                                            });
                                        }}
                                        disabled={false}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                );

            default:
                return null;
        }
    };

    const getFieldGridClass = (field: any) => {
        if (['multi-select', 'textarea', 'radio', 'toggle'].includes(field.type)) {
            return 'col-span-full';
        }
        return 'col-span-full md:col-span-1';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-8 px-4">
            <div className="w-full max-w-4xl mx-auto space-y-8">
                {/* Header with Logo */}
                <div className="flex flex-col items-center space-y-6">
                    <Logo />
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                            Profile Setup
                        </h1>
                        <p className="text-muted-foreground text-lg">Complete your profile to get started</p>
                    </div>
                </div>

                {/* Progress Steps */}
                <Card className="border-muted/50 shadow-md backdrop-blur-sm bg-card/95">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-foreground font-semibold">Step {currentStep} of {totalSteps}</span>
                                <Badge variant="secondary" className="font-semibold px-3 py-1">
                                    {Math.round((currentStep / totalSteps) * 100)}% Complete
                                </Badge>
                            </div>
                            <div className="relative">
                                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary/80">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-all duration-700 ease-out shadow-lg shadow-primary/30"
                                        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between pt-2">
                                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                                    <div key={step} className="flex flex-col items-center gap-2">
                                        <div className={`transition-all duration-300 ${step <= currentStep ? 'scale-110' : 'scale-100'}`}>
                                            {step < currentStep ? (
                                                <CheckCircle2 className="h-6 w-6 text-primary drop-shadow-sm" />
                                            ) : step === currentStep ? (
                                                <div className="relative">
                                                    <Circle className="h-6 w-6 fill-primary text-primary animate-pulse" />
                                                </div>
                                            ) : (
                                                <Circle className="h-6 w-6 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium transition-colors ${step <= currentStep ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                                            Step {step}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Form Card */}
                <Card className="border-muted/50 shadow-xl backdrop-blur-sm bg-card/95">
                    <CardHeader className="space-y-4 pb-6 border-b border-border/50">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                                    {currentStepData.title}
                                </CardTitle>
                                {currentStepData.description && (
                                    <CardDescription className="text-base text-muted-foreground mt-2">
                                        {currentStepData.description}
                                    </CardDescription>
                                )}
                            </div>
                            {currentStepData.optional && (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 shrink-0">
                                    Optional
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="">
                        <Form {...form}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {currentStepData.fields.map((field: any) => (
                                    <div key={field.key} className={getFieldGridClass(field)}>
                                        {renderField(field)}
                                    </div>
                                ))}
                            </div>
                        </Form>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <Card className="border-muted/50 shadow-md backdrop-blur-sm bg-card/95">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onBack}
                                disabled={isFirstStep}
                                className="min-w-[140px] h-11 font-semibold transition-all hover:bg-accent hover:scale-105 disabled:scale-100"
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                onClick={onContinue}
                                className="min-w-[140px] h-11 font-semibold bg-gradient-to-r from-primary via-primary to-primary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all"
                            >
                                {isLastStep ? '✓ Complete Setup' : 'Continue'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer hint */}
                <div className="text-center text-sm text-muted-foreground pb-4">
                    <p>All your information is secure and private</p>
                </div>
            </div>
        </div>
    );
};

export default ProfileSetupStep;