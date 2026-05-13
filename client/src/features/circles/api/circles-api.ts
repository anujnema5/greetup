/**
 * Circles feature — RTK Query endpoints.
 *
 * 1. Cache tags
 * 2. Request helpers
 * 3. Endpoints (categories → active list → create)
 */

import { API_ENDPOINTS, baseApi, buildQueryParams } from "@/lib/api";

import type {
  ActiveCirclesApiResponse,
  CreateCircleApiResponse,
  CreateCircleRequest,
  ListCircleCategoriesApiResponse,
  UpdateScheduledCircleApiResponse,
  UpdateScheduledCircleRequest,
} from "../types/circles-api.types";

const { CIRCLES } = API_ENDPOINTS;

// ── Cache tags ────────────────────────────────────────────────────────────────

const CACHE_CIRCLE_CATEGORIES = { type: "CircleCategories" as const, id: "LIST" as const };
const CACHE_ACTIVE_CIRCLES = { type: "ActiveCircles" as const, id: "LIST" as const };

// ── Types ─────────────────────────────────────────────────────────────────────

export type ListActiveCirclesArgs = {
  cursor?: string;
  limit?: number;
};

// ── API slice ─────────────────────────────────────────────────────────────────

export const circlesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCircleCategories: build.query<ListCircleCategoriesApiResponse, void>({
      query: () => CIRCLES.CATEGORIES,
      providesTags: [CACHE_CIRCLE_CATEGORIES],
    }),

    listActiveCircles: build.query<ActiveCirclesApiResponse, ListActiveCirclesArgs>({
      query: (args = {}) => {
        const qs = buildQueryParams({
          cursor: args.cursor,
          limit: args.limit,
        });
        return qs ? `${CIRCLES.ACTIVE}?${qs}` : CIRCLES.ACTIVE;
      },
      providesTags: [CACHE_ACTIVE_CIRCLES],
    }),

    createCircle: build.mutation<CreateCircleApiResponse, CreateCircleRequest>({
      query: (body) => ({
        url: CIRCLES.CREATE,
        method: "POST",
        body,
      }),
      invalidatesTags: [CACHE_ACTIVE_CIRCLES],
    }),

    updateScheduledCircle: build.mutation<
      UpdateScheduledCircleApiResponse,
      { roomId: string; body: UpdateScheduledCircleRequest }
    >({
      query: ({ roomId, body }) => ({
        url: CIRCLES.patch(roomId),
        method: "PATCH",
        body,
      }),
      invalidatesTags: [CACHE_ACTIVE_CIRCLES],
    }),
  }),
});

export const {
  useListCircleCategoriesQuery,
  useListActiveCirclesQuery,
  useCreateCircleMutation,
  useUpdateScheduledCircleMutation,
} = circlesApi;
