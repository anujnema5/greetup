import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

type OnlinePeopleCountData = {
  onlinePeopleCount: number;
};

type OnlinePeopleCountResponse = ApiResponse<OnlinePeopleCountData>;

const CACHE_ONLINE_PEOPLE_COUNT = { type: "Presence" as const, id: "ONLINE_PEOPLE_COUNT" as const };

export const presenceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOnlinePeopleCount: build.query<number, void>({
      query: () => API_ENDPOINTS.PRESENCE.ONLINE_PEOPLE_COUNT,
      transformResponse: (response: OnlinePeopleCountResponse) =>
        response.data?.onlinePeopleCount ?? 0,
      providesTags: [CACHE_ONLINE_PEOPLE_COUNT],
    }),
  }),
});

export const { useGetOnlinePeopleCountQuery } = presenceApi;
