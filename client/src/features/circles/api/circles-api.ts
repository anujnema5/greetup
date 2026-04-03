import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  CreateCircleApiResponse,
  CreateCircleRequest,
  ListCircleCategoriesApiResponse,
} from "../types/circles-api.types";

const { CIRCLES } = API_ENDPOINTS;

export const circlesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listCircleCategories: build.query<ListCircleCategoriesApiResponse, void>({
      query: () => CIRCLES.CATEGORIES,
      providesTags: [{ type: "CircleCategories", id: "LIST" }],
    }),
    createCircle: build.mutation<CreateCircleApiResponse, CreateCircleRequest>({
      query: (body) => ({
        url: CIRCLES.CREATE,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useListCircleCategoriesQuery, useCreateCircleMutation } =
  circlesApi;
