import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  ConnectionListFilter,
  ListConnectionsApiResponse,
  ListConnectionsData,
} from "../types/connections-api.types";

const { CONNECTIONS } = API_ENDPOINTS;

export const connectionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyConnections: build.query<
      ListConnectionsApiResponse,
      { filter?: ConnectionListFilter; page?: number; limit?: number; q?: string }
    >({
      query: ({ filter = "accepted", page, limit, q }) => {
        const params = new URLSearchParams({ filter });
        if (page !== undefined) params.set("page", String(page));
        if (limit !== undefined) params.set("limit", String(limit));
        if (q?.trim()) params.set("q", q.trim());
        return `${CONNECTIONS.LIST}?${params.toString()}`;
      },
      providesTags: [{ type: "Connections", id: "LIST" }],
    }),

    /** Paginated accepted connections + search (infinite scroll). */
    acceptedConnections: build.infiniteQuery<
      ListConnectionsData,
      { limit: number; q?: string },
      number
    >({
      query: ({ queryArg, pageParam }) => {
        const params = new URLSearchParams({
          filter: "accepted",
          page: String(pageParam),
          limit: String(queryArg.limit),
        });
        if (queryArg.q?.trim()) params.set("q", queryArg.q.trim());
        return `${CONNECTIONS.LIST}?${params.toString()}`;
      },
      transformResponse: (response: ListConnectionsApiResponse): ListConnectionsData => {
        if (!response.success || !response.data) {
          return { items: [] };
        }
        return response.data;
      },
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.hasMore ? (lastPage.page ?? 1) + 1 : undefined,
      },
      providesTags: [{ type: "Connections", id: "ACCEPTED_INFINITE" }],
    }),
  }),
});

export const {
  useGetMyConnectionsQuery,
  useLazyGetMyConnectionsQuery,
  useAcceptedConnectionsInfiniteQuery,
} = connectionsApi;
