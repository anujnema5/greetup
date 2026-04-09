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
} from "../types/profile-setup-api.types";
import type { MyProfileResponse } from "@/features/profile/types/my-profile.types";

const { PROFILE } = API_ENDPOINTS;

export type RoomInviteSettingsPayload = {
  policy: "all_connections" | "selected_only";
  allowlistedUserIds: string[];
};

export type RoomInviteSettingsData = MyProfileResponse["roomInvite"];

export const profileSetupApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOnboardingStatus: build.query<OnboardingStatusResponse, void>({
      query: () => PROFILE.ONBOARDING_STATUS,
      providesTags: [{ type: "ProfileSetupSteps", id: "ONBOARDING" }],
    }),
    getProfileSetupSteps: build.query<ProfileSetupApiResponse, void>({
      query: () => PROFILE.SETUP_STEPS,
      providesTags: [{ type: "ProfileSetupSteps", id: "LIST" }],
    }),
    getMyProfile: build.query<ApiResponse<MyProfileResponse>, void>({
      query: () => PROFILE.ME,
      providesTags: [{ type: "ProfileMe", id: "CURRENT" }],
    }),
    saveProfileSetup: build.mutation<
      SaveProfileSetupApiResponse,
      SaveProfileSetupPayload
    >({
      query: (body) => ({
        url: PROFILE.PROFILE_SETUP,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "ProfileSetupSteps", id: "LIST" },
        { type: "ProfileSetupSteps", id: "ONBOARDING" },
        { type: "ProfileMe", id: "CURRENT" },
      ],
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
      invalidatesTags: [{ type: "ProfileMe", id: "CURRENT" }],
    }),
    presignProfilePhoto: build.mutation<
      ApiResponse<PresignProfilePhotoData>,
      { contentType: string }
    >({
      query: (body) => ({
        url: PROFILE.PHOTOS_PRESIGN,
        method: "POST",
        body,
      }),
    }),
    getMatchPrepCurrent: build.query<MatchPrepCurrentData, void>({
      query: () => PROFILE.MATCH_PREP_CURRENT,
      transformResponse: (response: ApiResponse<MatchPrepCurrentData>): MatchPrepCurrentData => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Could not load saved match prep");
        }
        return response.data;
      },
      providesTags: [{ type: "ProfileMe", id: "MATCH_PREP_CURRENT" }],
    }),
    getMatchPrepOptions: build.query<MatchPrepOptionsData, void>({
      query: () => PROFILE.MATCH_PREP_OPTIONS,
      transformResponse: (response: ApiResponse<MatchPrepOptionsData>): MatchPrepOptionsData => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Could not load match prep options");
        }
        return response.data;
      },
    }),
    getMatchPrepPromptStatus: build.query<{ shouldShow: boolean }, string>({
      query: (clientSessionId) => ({
        url: PROFILE.MATCH_PREP_PROMPT_STATUS,
        params: { clientSessionId },
      }),
      transformResponse: (response: ApiResponse<{ shouldShow: boolean }>): { shouldShow: boolean } => {
        if (!response.success || response.data == null) {
          throw new Error(response.message ?? "Could not load prompt status");
        }
        return response.data;
      },
      providesTags: [{ type: "MatchPrepPrompt", id: "STATUS" }],
    }),
    saveMatchPrep: build.mutation<
      void,
      {
        moodIds: string[];
        lookingForIds: string[];
        interestIds: string[];
        sessionGoal?: string | null;
        connectionPreference?: "same_profession" | "different_profession" | "open_to_anyone";
        clientSessionId?: string;
      }
    >({
      query: (body) => ({
        url: PROFILE.MATCH_PREP,
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<{ ok: boolean }>): void => {
        if (!response.success) {
          throw new Error(response.message ?? "Could not save match prep");
        }
      },
      invalidatesTags: [
        { type: "ProfileMe", id: "CURRENT" },
        { type: "ProfileMe", id: "MATCH_PREP_CURRENT" },
        { type: "MatchPrepPrompt", id: "STATUS" },
        { type: "ProfileSetupSteps", id: "LIST" },
      ],
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
  useSaveMatchPrepMutation,
} = profileSetupApi;