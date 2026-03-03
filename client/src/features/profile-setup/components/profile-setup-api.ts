import { API_ENDPOINTS, baseApi } from "@/lib/api";
import type {
  ProfileSetupApiResponse,
  SaveProfileSetupApiResponse,
  SaveProfileSetupPayload,
} from "../types/profile-setup-api.types";

const { PROFILE } = API_ENDPOINTS;

export interface OnboardingStatusResponse {
  success: boolean
  data: { isOnboarded: boolean }
}

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
      ],
    }),
  }),
});

export const {
  useGetOnboardingStatusQuery,
  useGetProfileSetupStepsQuery,
  useLazyGetProfileSetupStepsQuery,
  useSaveProfileSetupMutation,
} = profileSetupApi;