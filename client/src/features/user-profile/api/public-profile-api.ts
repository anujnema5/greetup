import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { publicProfileRtkCacheId } from "@/lib/api/public-profile-rtk-cache";

import type {
  PublicProfileApiResponse,
  PublicProfileData,
} from "../types/public-profile.types";

export const publicProfileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPublicProfile: build.query<PublicProfileData, string>({
      query: (username) => API_ENDPOINTS.PROFILE.public(publicProfileRtkCacheId(username)),
      transformResponse: (response: PublicProfileApiResponse): PublicProfileData => {
        if (!response.success || !response.data) {
          throw new Error("INVALID_PROFILE_RESPONSE");
        }
        return response.data;
      },
      providesTags: (_result, _err, username) => [
        { type: "PublicProfile" as const, id: publicProfileRtkCacheId(username) },
      ],
    }),
  }),
});

export const { useGetPublicProfileQuery } = publicProfileApi;
