import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { ProfileSetupApiResponse } from "../types/profile-setup-api.types";

const { PROFILE } = API_ENDPOINTS;

export const profileSetupApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getProfileSetupSteps: build.query<ProfileSetupApiResponse, void>({
            query: () => PROFILE.SETUP_STEPS,
            providesTags: [{ type: 'ProfileSetupSteps', id: 'LIST' }]
        })
    }),
})

export const {
    useGetProfileSetupStepsQuery,
    useLazyGetProfileSetupStepsQuery
} = profileSetupApi