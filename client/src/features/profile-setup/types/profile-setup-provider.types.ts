export interface ProfileSetupProvider {
    currentStep: number;
    totalSteps: number;
    currentStepData: any; // or create proper type
    onContinue: () => Promise<void>;
    onBack: () => void;
    isLastStep: boolean;
    isFirstStep: boolean;
    isLoading: boolean;
    allFormData: Record<string, any>;
}