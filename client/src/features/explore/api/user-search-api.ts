/**
 * Explore / user search — RTK Query endpoints.
 *
 * 1. Response shaping
 * 2. Search query (`q` is always sent, even when empty — matches prior `URLSearchParams` behavior)
 */

import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  SearchUsersApiResponse,
  SearchUsersData,
} from "../types/user-search.types";

// ── Response transform ────────────────────────────────────────────────────────

function toSearchUsersData(response: SearchUsersApiResponse): SearchUsersData {
  if (response.success && response.data) {
    return response.data;
  }
  return { items: [] };
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const userSearchApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchUsers: build.query<SearchUsersData, { q: string; limit?: number }>({
      query: ({ q, limit = 12 }) => {
        const params = new URLSearchParams();
        params.set("q", q.trim());
        params.set("limit", String(limit));
        return `${API_ENDPOINTS.SEARCH.USERS}?${params.toString()}`;
      },
      transformResponse: toSearchUsersData,
    }),
  }),
});

export const { useSearchUsersQuery, useLazySearchUsersQuery } = userSearchApi;
