export interface ProfileSetupData {
    // Step 1 - Basic Identity
    displayName?: string;
    username?: string;
    age?: number;
    gender?: string;
    country?: { code: string; name: string };

    // Step 2 - Language & Communication
    languages?: string[] | any[]; // Array of language IDs or objects
    primaryLanguage?: string;
    voiceCallPreference?: string;
    videoCallPreference?: string;

    // Step 3 - Interests
    interests?: string[] | any[]; // Array of interest IDs or objects
    musicGenres?: string[] | any[]; // Array of genre IDs or objects
    moods?: string[] | any[]; // Array of mood IDs or objects
    personalityTags?: string[];

    // Step 4 - Mood & Intent
    dateMode?: boolean;
    lookingFor?: string;
    genderPreference?: string;
    ageRange?: { min: number; max: number };
    conversationBoundary?: string;

    // Step 5 - Bio & Photos
    bio?: string;
    photos?: any[];
    profession?: string;
    educationLevel?: string;

    // Step 6 - Games & Activities
    interestedInGames?: boolean;
    favoriteGames?: string;
}