import { API_ENDPOINTS, baseApi, buildQueryParams } from "@/lib/api";
import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

import type { ProfileInsightsData } from "../types/profile-insights.types";

const CACHE_PROFILE_INSIGHTS = { type: "ProfileMe" as const, id: "INSIGHTS" as const };

export const PROFILE_INSIGHTS_RECENT_MATCHES_LIMIT = 50;

export type GetProfileInsightsArgs = {
  recentLimit?: number;
};

function toProfileInsights(response: ApiResponse<ProfileInsightsData>): ProfileInsightsData {
  if (!response.data) {
    throw new Error("Profile insights response missing data");
  }
  return response.data;
}

export const profileInsightsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProfileInsights: build.query<ProfileInsightsData, GetProfileInsightsArgs | void>({
      query: (arg) => {
        const recentLimit =
          arg && typeof arg === "object" && "recentLimit" in arg ? arg.recentLimit : undefined;
        const qs = buildQueryParams({ recentLimit });
        return qs ? `${API_ENDPOINTS.PROFILE.ME_INSIGHTS}?${qs}` : API_ENDPOINTS.PROFILE.ME_INSIGHTS;
      },
      transformResponse: toProfileInsights,
      providesTags: [CACHE_PROFILE_INSIGHTS],
    }),
  }),
});

export const { useGetProfileInsightsQuery } = profileInsightsApi;
