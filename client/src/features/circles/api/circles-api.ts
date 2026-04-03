import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  ActiveCirclesApiResponse,
  CreateCircleApiResponse,
  CreateCircleRequest,
  ListCircleCategoriesApiResponse,
} from "../types/circles-api.types";

const { CIRCLES } = API_ENDPOINTS;

export type ListActiveCirclesArgs = {
  cursor?: string;
  limit?: number;
};

export const circlesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCircleCategories: build.query<ListCircleCategoriesApiResponse, void>({
      query: () => CIRCLES.CATEGORIES,
      providesTags: [{ type: "CircleCategories", id: "LIST" }],
    }),
    listActiveCircles: build.query<ActiveCirclesApiResponse, ListActiveCirclesArgs>({
      query: ({ cursor, limit } = {}) => {
        const params = new URLSearchParams();
        if (cursor) params.set("cursor", cursor);
        if (limit) params.set("limit", String(limit));
        const qs = params.toString();
        return qs ? `${CIRCLES.ACTIVE}?${qs}` : CIRCLES.ACTIVE;
      },
      providesTags: [{ type: "ActiveCircles", id: "LIST" }],
    }),
    createCircle: build.mutation<CreateCircleApiResponse, CreateCircleRequest>({
      query: (body) => ({
        url: CIRCLES.CREATE,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ActiveCircles", id: "LIST" }],
    }),
  }),
});

export const {
  useListCircleCategoriesQuery,
  useListActiveCirclesQuery,
  useCreateCircleMutation,
} = circlesApi;
