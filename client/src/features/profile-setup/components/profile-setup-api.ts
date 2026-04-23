/**
 * Profile setup & “my profile” — RTK Query endpoints.
 *
 * 1. Exported payload types (used by UI)
 * 2. Cache tags
 * 3. Response transforms (unwrap `ApiResponse.data` + errors)
 * 4. Endpoints: onboarding → setup steps → profile me → match prep → mutations
 */

import { API_ENDPOINTS, baseApi } from "@/lib/api";
import type {
  ApiResponse,
  OnboardingStatusResponse,
  PresignProfilePhotoData,
  ProfileSetupApiResponse,
  SaveProfileSetupApiResponse,
  SaveProfileSetupPayload,
  MatchPrepCurrentData,
  MatchPrepOptionsData,
  ResolvedLocationData,
  ResolvedLocationSuggestionData,
} from "../types/profile-setup-api.types";
import type { MyProfileResponse } from "@/features/profile/types/my-profile.types";

const { PROFILE } = API_ENDPOINTS;

// ── Types shared with components ─────────────────────────────────────────────

export type RoomInviteSettingsPayload = {
  policy: "all_connections" | "selected_only";
  allowlistedUserIds: string[];
};

export type RoomInviteSettingsData = MyProfileResponse["roomInvite"];

type SaveMatchPrepBody = {
  moodIds: string[];
  lookingForIds: string[];
  interestIds: string[];
  sessionGoal?: string | null;
  connectionPreference?: "same_profession" | "different_profession" | "open_to_anyone";
  locationPreferenceEnabled?: boolean;
  distancePreference?: "random" | "same_city" | "same_country" | "global";
  location?: {
    country: string;
    countryCode: string;
    region?: string;
    regionCode?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    source?: "current" | "manual";
  };
  clientSessionId?: string;
};

// ── Cache tags ────────────────────────────────────────────────────────────────

const CACHE_ONBOARDING_STATUS = { type: "ProfileSetupSteps" as const, id: "ONBOARDING" as const };
const CACHE_PROFILE_SETUP_STEPS = { type: "ProfileSetupSteps" as const, id: "LIST" as const };
const CACHE_PROFILE_ME = { type: "ProfileMe" as const, id: "CURRENT" as const };
const CACHE_MATCH_PREP_CURRENT = { type: "ProfileMe" as const, id: "MATCH_PREP_CURRENT" as const };
const CACHE_MATCH_PREP_PROMPT = { type: "MatchPrepPrompt" as const, id: "STATUS" as const };

const INVALIDATE_AFTER_SAVE_PROFILE = [
  CACHE_PROFILE_SETUP_STEPS,
  CACHE_ONBOARDING_STATUS,
  CACHE_PROFILE_ME,
];

const INVALIDATE_AFTER_SAVE_MATCH_PREP = [
  CACHE_PROFILE_ME,
  CACHE_MATCH_PREP_CURRENT,
  CACHE_MATCH_PREP_PROMPT,
  CACHE_PROFILE_SETUP_STEPS,
];

// ── Response transforms ─────────────────────────────────────────────────────────

function toMatchPrepCurrent(response: ApiResponse<MatchPrepCurrentData>): MatchPrepCurrentData {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not load saved match prep");
  }
  return response.data;
}

function toMatchPrepOptions(response: ApiResponse<MatchPrepOptionsData>): MatchPrepOptionsData {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not load match prep options");
  }
  return response.data;
}

function toMatchPrepPromptStatus(
  response: ApiResponse<{ shouldShow: boolean }>,
): { shouldShow: boolean } {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not load prompt status");
  }
  return response.data;
}

function voidFromSaveMatchPrepResponse(response: ApiResponse<{ ok: boolean }>): void {
  if (!response.success) {
    throw new Error(response.message ?? "Could not save match prep");
  }
}

function toResolvedLocationData(response: ApiResponse<ResolvedLocationData>): ResolvedLocationData {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not resolve location");
  }
  return response.data;
}

function toResolvedLocationSuggestionsData(
  response: ApiResponse<{ suggestions: ResolvedLocationSuggestionData[] }>,
): ResolvedLocationSuggestionData[] {
  if (!response.success || response.data == null) {
    throw new Error(response.message ?? "Could not fetch location suggestions");
  }
  return response.data.suggestions ?? [];
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const profileSetupApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // --- Onboarding & profile shape -------------------------------------------

    getOnboardingStatus: build.query<OnboardingStatusResponse, void>({
      query: () => PROFILE.ONBOARDING_STATUS,
      providesTags: [CACHE_ONBOARDING_STATUS],
    }),

    getProfileSetupSteps: build.query<ProfileSetupApiResponse, void>({
      query: () => ({ url: PROFILE.SETUP_STEPS, params: { limit: 10 } }),
      providesTags: [CACHE_PROFILE_SETUP_STEPS],
    }),

    getMyProfile: build.query<ApiResponse<MyProfileResponse>, void>({
      query: () => PROFILE.ME,
      providesTags: [CACHE_PROFILE_ME],
    }),

    // --- Profile mutations -----------------------------------------------------

    saveProfileSetup: build.mutation<SaveProfileSetupApiResponse, SaveProfileSetupPayload>({
      query: (body) => ({
        url: PROFILE.PROFILE_SETUP,
        method: "POST",
        body,
      }),
      invalidatesTags: INVALIDATE_AFTER_SAVE_PROFILE,
    }),

    updateRoomInviteSettings: build.mutation<
      ApiResponse<RoomInviteSettingsData>,
      RoomInviteSettingsPayload
    >({
      query: (body) => ({
        url: PROFILE.ROOM_INVITE_SETTINGS,
        method: "PUT",
        body,
      }),
      invalidatesTags: [CACHE_PROFILE_ME],
    }),

    presignProfilePhoto: build.mutation<ApiResponse<PresignProfilePhotoData>, { contentType: string }>(
      {
        query: (body) => ({
          url: PROFILE.PHOTOS_PRESIGN,
          method: "POST",
          body,
        }),
      },
    ),

    // --- Match prep (preferences before matching) -----------------------------

    getMatchPrepCurrent: build.query<MatchPrepCurrentData, void>({
      query: () => PROFILE.MATCH_PREP_CURRENT,
      transformResponse: toMatchPrepCurrent,
      providesTags: [CACHE_MATCH_PREP_CURRENT],
    }),

    getMatchPrepOptions: build.query<MatchPrepOptionsData, void>({
      query: () => PROFILE.MATCH_PREP_OPTIONS,
      transformResponse: toMatchPrepOptions,
    }),

    getMatchPrepPromptStatus: build.query<{ shouldShow: boolean }, string>({
      query: (clientSessionId) => ({
        url: PROFILE.MATCH_PREP_PROMPT_STATUS,
        params: { clientSessionId },
      }),
      transformResponse: toMatchPrepPromptStatus,
      providesTags: [CACHE_MATCH_PREP_PROMPT],
    }),

    getLocationSuggestions: build.query<
      ResolvedLocationSuggestionData[],
      { query: string; limit?: number }
    >({
      query: ({ query, limit = 5 }) => ({
        url: PROFILE.LOCATION_SUGGESTIONS,
        params: { query, limit },
      }),
      transformResponse: toResolvedLocationSuggestionsData,
    }),

    geocodeLocation: build.mutation<ResolvedLocationData, { query: string }>({
      query: (body) => ({
        url: PROFILE.LOCATION_GEOCODE,
        method: "POST",
        body,
      }),
      transformResponse: toResolvedLocationData,
    }),

    reverseGeocodeLocation: build.mutation<
      ResolvedLocationData,
      { latitude: number; longitude: number }
    >({
      query: (body) => ({
        url: PROFILE.LOCATION_REVERSE_GEOCODE,
        method: "POST",
        body,
      }),
      transformResponse: toResolvedLocationData,
    }),

    saveMatchPrep: build.mutation<void, SaveMatchPrepBody>({
      query: (body) => ({
        url: PROFILE.MATCH_PREP,
        method: "POST",
        body,
      }),
      transformResponse: voidFromSaveMatchPrepResponse,
      invalidatesTags: INVALIDATE_AFTER_SAVE_MATCH_PREP,
    }),
  }),
});

export const {
  useGetOnboardingStatusQuery,
  useGetProfileSetupStepsQuery,
  useGetMyProfileQuery,
  useLazyGetProfileSetupStepsQuery,
  useSaveProfileSetupMutation,
  useUpdateRoomInviteSettingsMutation,
  usePresignProfilePhotoMutation,
  useGetMatchPrepCurrentQuery,
  useGetMatchPrepOptionsQuery,
  useGetMatchPrepPromptStatusQuery,
  useLazyGetLocationSuggestionsQuery,
  useGeocodeLocationMutation,
  useReverseGeocodeLocationMutation,
  useSaveMatchPrepMutation,
} = profileSetupApi;
