/**
 * Public profile (by username) — RTK Query endpoints.
 *
 * Cache id is normalized via `publicProfileRtkCacheId` so it matches invalidation from
 * connections and other features.
 */

import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { publicProfileRtkCacheId } from "./public-profile-rtk-cache";

import type {
  PublicProfileApiResponse,
  PublicProfileData,
} from "../types/public-profile.types";

// ── Response transform ────────────────────────────────────────────────────────

function toPublicProfileData(response: PublicProfileApiResponse): PublicProfileData {
  if (!response.success || !response.data) {
    throw new Error("INVALID_PROFILE_RESPONSE");
  }
  return response.data;
}

function cacheTagForUsername(username: string) {
  return {
    type: "PublicProfile" as const,
    id: publicProfileRtkCacheId(username),
  };
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const publicProfileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPublicProfile: build.query<PublicProfileData, string>({
      query: (username) => API_ENDPOINTS.PROFILE.public(publicProfileRtkCacheId(username)),
      transformResponse: toPublicProfileData,
      providesTags: (_result, _err, username) => [cacheTagForUsername(username)],
    }),
  }),
});

export const { useGetPublicProfileQuery } = publicProfileApi;
