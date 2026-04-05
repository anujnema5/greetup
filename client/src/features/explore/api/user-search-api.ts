import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  SearchUsersApiResponse,
  SearchUsersData,
} from "../types/user-search.types";

export const userSearchApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchUsers: build.query<SearchUsersData, { q: string; limit?: number }>({
      query: ({ q, limit = 12 }) => {
        const params = new URLSearchParams({ q: q.trim() });
        params.set("limit", String(limit));
        return `${API_ENDPOINTS.SEARCH.USERS}?${params.toString()}`;
      },
      transformResponse: (response: SearchUsersApiResponse): SearchUsersData =>
        response.success && response.data ? response.data : { items: [] },
    }),
  }),
});

export const { useSearchUsersQuery, useLazySearchUsersQuery } = userSearchApi;
