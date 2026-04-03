import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type {
  ConnectionListFilter,
  ListConnectionsApiResponse,
} from "../types/connections-api.types";

const { CONNECTIONS } = API_ENDPOINTS;

export const connectionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyConnections: build.query<
      ListConnectionsApiResponse,
      { filter?: ConnectionListFilter }
    >({
      query: ({ filter = "accepted" }) => {
        const params = new URLSearchParams({ filter });
        return `${CONNECTIONS.LIST}?${params.toString()}`;
      },
      providesTags: [{ type: "Connections", id: "LIST" }],
    }),
  }),
});

export const { useGetMyConnectionsQuery, useLazyGetMyConnectionsQuery } =
  connectionsApi;
