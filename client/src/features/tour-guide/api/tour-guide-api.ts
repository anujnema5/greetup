import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type WelcomeTourStatusData = {
  eligible: boolean;
  seenAt: string | null;
};

type WelcomeTourStatusResponse = ApiResponse<WelcomeTourStatusData>;

const CACHE_WELCOME_TOUR = { type: "WelcomeTour" as const, id: "STATUS" as const };

export const tourGuideApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWelcomeTourStatus: build.query<WelcomeTourStatusData, void>({
      query: () => API_ENDPOINTS.PROFILE.WELCOME_TOUR_STATUS,
      transformResponse: (response: WelcomeTourStatusResponse) =>
        response.data ?? { eligible: false, seenAt: null },
      providesTags: [CACHE_WELCOME_TOUR],
    }),

    markWelcomeTourSeen: build.mutation<void, void>({
      query: () => ({
        url: API_ENDPOINTS.PROFILE.WELCOME_TOUR_SEEN,
        method: "POST",
      }),
      invalidatesTags: [CACHE_WELCOME_TOUR],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          tourGuideApi.util.updateQueryData("getWelcomeTourStatus", undefined, (draft) => {
            draft.eligible = false;
            draft.seenAt = draft.seenAt ?? new Date().toISOString();
          }),
        );

        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const { useGetWelcomeTourStatusQuery, useMarkWelcomeTourSeenMutation } = tourGuideApi;
