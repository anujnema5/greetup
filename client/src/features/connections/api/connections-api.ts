import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { publicProfileRtkCacheId } from "@/lib/api/public-profile-rtk-cache";

import type {
  ConnectionListFilter,
  ListConnectionsApiResponse,
  ListConnectionsData,
  PendingIncomingCountResponse,
  RequestConnectionMutationArg,
  RequestConnectionResult,
  RespondConnectionMutationArg,
} from "../types/connections-api.types";

const { CONNECTIONS } = API_ENDPOINTS;

function tagsAfterRespondToConnection(arg: RespondConnectionMutationArg) {
  return [
    { type: "Connections" as const, id: "LIST" },
    { type: "Connections" as const, id: "ACCEPTED_INFINITE" },
    ...(arg.peerUsername
      ? [{ type: "PublicProfile" as const, id: publicProfileRtkCacheId(arg.peerUsername) }]
      : []),
  ];
}

const pendingIncomingCountTag = { type: "Connections" as const, id: "PENDING_INCOMING_COUNT" };

export const connectionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPendingIncomingConnectionCount: build.query<PendingIncomingCountResponse, void>({
      query: () => CONNECTIONS.PENDING_INCOMING_COUNT,
      providesTags: [pendingIncomingCountTag],
    }),

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

    requestConnection: build.mutation<RequestConnectionResult, RequestConnectionMutationArg>({
      query: ({ targetUserId }) => ({
        url: CONNECTIONS.REQUEST,
        method: "POST",
        body: { targetUserId },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Connections", id: "LIST" },
        { type: "Connections", id: "ACCEPTED_INFINITE" },
        pendingIncomingCountTag,
        ...(arg.invalidatePublicProfileUsername
          ? [
              {
                type: "PublicProfile" as const,
                id: publicProfileRtkCacheId(arg.invalidatePublicProfileUsername),
              },
            ]
          : []),
      ],
    }),

    acceptConnection: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.accept(connectionId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [...tagsAfterRespondToConnection(arg), pendingIncomingCountTag],
    }),

    rejectConnection: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.reject(connectionId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => [...tagsAfterRespondToConnection(arg), pendingIncomingCountTag],
    }),

    disconnectConnection: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.disconnect(connectionId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => tagsAfterRespondToConnection(arg),
    }),

    withdrawConnectionRequest: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.withdraw(connectionId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg) => tagsAfterRespondToConnection(arg),
    }),
  }),
});

export const {
  useGetPendingIncomingConnectionCountQuery,
  useGetMyConnectionsQuery,
  useLazyGetMyConnectionsQuery,
  useAcceptedConnectionsInfiniteQuery,
  useRequestConnectionMutation,
  useAcceptConnectionMutation,
  useRejectConnectionMutation,
  useDisconnectConnectionMutation,
  useWithdrawConnectionRequestMutation,
} = connectionsApi;
