/**
 * Profile Setup Types
 * 
 * Type definitions for profile setup forms and data
 */

export interface FormField {
    key: string;
    /** UUID of the backing entity (e.g. prompt_questions.id) — used by the client to build save payloads. */
    id?: string;
    name: string;
    label: string;
    placeholder?: string;
    /** Shown under the control when set (from server-driven step config). */
    description?: string;
    /** Passed through to HTML autocomplete when relevant (e.g. `"username"`). */
    autoComplete?: string;
    type: "text" | "number" | "select" | "multi-select" | "radio" | "toggle" |
          "range" | "textarea" | "photo-upload" | "country-select" | "username-picker";
    required?: boolean;
    value?: any;
    options?: string[] | any[];
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
}

export interface FormStep {
    step: number;
    title: string;
    /** Optional subtitle shown under the step title in onboarding. */
    description?: string;
    fields: FormField[];
    optional?: boolean;
}

export interface ProfileSetupData {
    // Step 1: Basic Identity
    displayName?: string;
    /** Required for onboarding — public handle for `/u/{username}`. */
    username?: string;
    age?: number;
    gender?: string;
    country?: {
        code: string;
        name: string;
    };

    // Step 2: Language & Communication
    languages?: Array<{
        id: string;
        name?: string;
        code?: string;
        isPrimary?: boolean;
        isPreferredForConversation?: boolean;
    }>;
    primaryLanguage?: string;
    voiceCallPreference?: string;
    videoCallPreference?: string;

    // Step 3: Interests
    interests?: Array<{
        id: string;
        interest?: string;
        category?: string;
    }>;
    musicGenres?: Array<{
        id: string;
        name?: string;
    }>;
    moods?: Array<{
        id: string;
        name?: string;
        emoji?: string;
    }>;
    personalityTraits?: Array<{
        id: string;
        name?: string;
        category?: string;
    }>;

    // Step 4: Mood & Intent
    dateMode?: boolean;
    lookingFor?: Array<{
        id: string;
        option?: string;
        isPrimary?: boolean;
    }>;
    genderPreference?: string;
    ageRange?: {
        min: number;
        max: number;
    };
    conversationBoundary?: string; // "clean" | "casual" | "flirty"

    // Step 5: Bio & Photos
    bio?: string;
    photos?: Array<{
        id?: string;
        url: string;
        order?: number;
        isVerified?: boolean;
    }>;
    profession?: string;
    educationLevel?: string;

    // Step 6: Games & Activities
    interestedInGames?: boolean;
    favoriteGames?: Array<{
        id: string;
        name?: string;
        genre?: string;
        skillLevel?: string;
        hoursPlayed?: number;
    }>;
}

export interface ProfileStepsResponse {
    status: number;
    data: {
        steps: FormStep[];
        profileCompletion: number;
        isProfileComplete: boolean;
    };
}