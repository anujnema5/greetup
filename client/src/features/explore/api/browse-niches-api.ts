import { API_ENDPOINTS, baseApi, buildQueryParams } from "@/lib/api";

import type {
  BrowseNicheRoomsApiResponse,
  BrowseNicheRoomsData,
  BrowseNicheRoomsQueryArgs,
  BrowseNichesApiResponse,
  BrowseNichesData,
} from "../types/browse-niches.types";

const { CIRCLES } = API_ENDPOINTS;

function unwrapNiches(res: BrowseNichesApiResponse): BrowseNichesData {
  if (res.success && res.data) return res.data;
  return { niches: [] };
}

function unwrapRooms(res: BrowseNicheRoomsApiResponse): BrowseNicheRoomsData {
  if (res.success && res.data) {
    return res.data;
  }
  return { items: [], nextCursor: null, hasMore: false };
}

export const browseNichesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBrowseNiches: build.query<BrowseNichesData, void>({
      query: () => CIRCLES.BROWSE_NICHES,
      transformResponse: unwrapNiches,
      providesTags: [{ type: "ExploreBrowseNiches", id: "LIST" }],
    }),

    getBrowseNicheRooms: build.query<BrowseNicheRoomsData, BrowseNicheRoomsQueryArgs>({
      query: ({ categoryId, cursor, limit }) => {
        const qs = buildQueryParams({ cursor, limit });
        const base = CIRCLES.browseNicheRooms(categoryId);
        return qs ? `${base}?${qs}` : base;
      },
      transformResponse: unwrapRooms,
      providesTags: (_result, _err, arg) => [
        { type: "ExploreBrowseNicheRooms", id: arg.categoryId },
      ],
    }),
  }),
});

export const { useGetBrowseNichesQuery, useLazyGetBrowseNicheRoomsQuery } = browseNichesApi;
