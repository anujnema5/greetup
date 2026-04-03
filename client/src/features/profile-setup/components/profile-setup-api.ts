import { API_ENDPOINTS, baseApi } from "@/lib/api";
import type { MyProfileResponse } from "@/features/profile/types/my-profile.types";
import type {
  ApiResponse,
  OnboardingStatusResponse,
  ProfileSetupApiResponse,
  SaveProfileSetupApiResponse,
  SaveProfileSetupPayload,
} from "../types/profile-setup-api.types";

const { PROFILE } = API_ENDPOINTS;

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
  }),
});

export const {
  useGetOnboardingStatusQuery,
  useGetProfileSetupStepsQuery,
  useGetMyProfileQuery,
  useLazyGetProfileSetupStepsQuery,
  useSaveProfileSetupMutation,
} = profileSetupApi;