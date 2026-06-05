import { API_ENDPOINTS, baseApi } from "@/lib/api";

import { CACHE_EXPLORE_SUGGESTED_PEOPLE } from "./suggested-people-cache-tags";
import { SUGGESTED_PEOPLE_FETCH_LIMIT } from "../constants/suggested-people";
import type {
  SuggestedPeopleApiResponse,
  SuggestedPeopleData,
} from "../types/suggested-people.types";

function toSuggestedPeopleData(response: SuggestedPeopleApiResponse): SuggestedPeopleData {
  if (response.success && response.data) {
    return response.data;
  }
  return {
    items: [],
    hasInterests: false,
    page: 1,
    limit: SUGGESTED_PEOPLE_FETCH_LIMIT,
    hasMore: false,
  };
}

export const suggestedPeopleApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSuggestedPeople: build.query<SuggestedPeopleData, void>({
      query: () => {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", String(SUGGESTED_PEOPLE_FETCH_LIMIT));
        return `${API_ENDPOINTS.SEARCH.SUGGESTED_PEOPLE}?${params.toString()}`;
      },
      transformResponse: toSuggestedPeopleData,
      providesTags: [CACHE_EXPLORE_SUGGESTED_PEOPLE],
    }),
  }),
});

export const { useGetSuggestedPeopleQuery } = suggestedPeopleApi;
