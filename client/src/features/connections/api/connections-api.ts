/**
 * Connections feature — RTK Query endpoints.
 *
 * Read this file top to bottom:
 * 1. Cache tag constants (what gets invalidated when data changes)
 * 2. Small helpers for tags and list URLs
 * 3. Response shaping
 * 4. Endpoint definitions (queries, then mutations)
 */

import { API_ENDPOINTS, baseApi, buildQueryParamsObject } from "@/lib/api";
import { publicProfileRtkCacheId } from "@/features/user-profile/api/public-profile-rtk-cache";

import { CONNECTIONS_PEERS_CALL_STATUS_TAG } from "./connections-rtk-cache-tags";

import type {
  ConnectionListFilter,
  ListConnectionsApiResponse,
  ListConnectionsData,
  PeerCallStatusEntry,
  PeersCallStatusApiResponse,
  PendingIncomingCountResponse,
  RequestConnectionMutationArg,
  RequestConnectionResult,
  RespondConnectionMutationArg,
} from "../types/connections-api.types";

const { CONNECTIONS } = API_ENDPOINTS;

// ── Cache tags (RTK) ────────────────────────────────────────────────────────
// These ids must stay in sync with `providesTags` / `invalidatesTags` usage below.

/** “My connections” list (filtered / paged). */
const CACHE_CONNECTIONS_LIST = { type: "Connections" as const, id: "LIST" as const };

/** Infinite-scroll list of accepted connections + search. */
const CACHE_ACCEPTED_CONNECTIONS_INFINITE = {
  type: "Connections" as const,
  id: "ACCEPTED_INFINITE" as const,
};

/** Navbar / badge: how many incoming requests are waiting. */
const CACHE_PENDING_INCOMING_COUNT = {
  type: "Connections" as const,
  id: "PENDING_INCOMING_COUNT" as const,
};

// ── Tag helpers ───────────────────────────────────────────────────────────────

/** When a username is known, also refresh that user’s public profile cache. */
function tagsForPublicProfile(username: string | null | undefined) {
  if (!username) return [];
  return [{ type: "PublicProfile" as const, id: publicProfileRtkCacheId(username) }];
}

/**
 * After almost any connection action, refetch:
 * - the main connections list
 * - the infinite “accepted” list
 * - optionally the peer’s public profile (if we know their username)
 */
function tagsToRefreshAfterConnectionAction(arg: RespondConnectionMutationArg) {
  return [
    CACHE_CONNECTIONS_LIST,
    CACHE_ACCEPTED_CONNECTIONS_INFINITE,
    ...tagsForPublicProfile(arg.peerUsername),
  ];
}

/**
 * Accept / reject: same as above, plus refresh the pending-incoming count
 * (an incoming request was removed from the queue).
 */
function invalidateAfterAcceptOrReject(
  _result: unknown,
  _error: unknown,
  arg: RespondConnectionMutationArg,
) {
  return [...tagsToRefreshAfterConnectionAction(arg), CACHE_PENDING_INCOMING_COUNT];
}

/**
 * Disconnect / withdraw: refresh lists and profiles, but the pending-incoming
 * counter is unchanged (we didn’t resolve an incoming request).
 */
function invalidateAfterDisconnectOrWithdraw(
  _result: unknown,
  _error: unknown,
  arg: RespondConnectionMutationArg,
) {
  return tagsToRefreshAfterConnectionAction(arg);
}

/** Shared GET `CONNECTIONS.LIST` shape for RTK (url + query params). */
function connectionsListGetRequest(queryParams: Record<string, unknown>) {
  return {
    url: CONNECTIONS.LIST,
    params: buildQueryParamsObject(queryParams),
  };
}

// ── Response transforms ───────────────────────────────────────────────────────

function toListConnectionsData(response: ListConnectionsApiResponse): ListConnectionsData {
  if (!response.success || !response.data) {
    return { items: [] };
  }
  return response.data;
}

function toPeersCallStatusMap(
  response: PeersCallStatusApiResponse,
): Record<string, PeerCallStatusEntry> {
  if (!response.success || !response.data?.statuses) {
    throw new Error(response.message ?? "Could not load peer status");
  }
  return response.data.statuses;
}

// ── Argument types (kept next to the slice for easy reference) ────────────────

type ListConnectionsQueryArg = {
  filter?: ConnectionListFilter;
  page?: number;
  limit?: number;
  q?: string;
};

type AcceptedConnectionsInfiniteQueryArg = {
  limit: number;
  q?: string;
};

// ── API slice ─────────────────────────────────────────────────────────────────

export const connectionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // --- Simple queries -------------------------------------------------------

    getPendingIncomingConnectionCount: build.query<PendingIncomingCountResponse, void>({
      query: () => CONNECTIONS.PENDING_INCOMING_COUNT,
      providesTags: [CACHE_PENDING_INCOMING_COUNT],
    }),

    /**
     * Batch load online / in-room flags for many user ids at once.
     * Cache key: sorted user ids joined with `|`.
     */
    peersCallStatus: build.query<Record<string, PeerCallStatusEntry>, string>({
      query: (cacheKey) => {
        const userIds = cacheKey ? cacheKey.split("|").filter(Boolean) : [];
        return {
          url: CONNECTIONS.PEERS_CALL_STATUS,
          method: "POST",
          body: { userIds },
        };
      },
      transformResponse: toPeersCallStatusMap,
      providesTags: [CONNECTIONS_PEERS_CALL_STATUS_TAG],
    }),

    getMyConnections: build.query<ListConnectionsApiResponse, ListConnectionsQueryArg>({
      query: (args) => {
        return connectionsListGetRequest({
          filter: args.filter ?? "accepted",
          page: args.page,
          limit: args.limit,
          q: args.q,
        });
      },
      providesTags: [CACHE_CONNECTIONS_LIST],
    }),

    /**
     * Same HTTP route as `getMyConnections`, but tuned for infinite scroll:
     * only accepted connections, page comes from `pageParam`.
     */
    acceptedConnections: build.infiniteQuery<
      ListConnectionsData,
      AcceptedConnectionsInfiniteQueryArg,
      number
    >({
      query: ({ queryArg, pageParam }) => {
        return connectionsListGetRequest({
          filter: "accepted",
          page: pageParam,
          limit: queryArg.limit,
          q: queryArg.q,
        });
      },
      transformResponse: toListConnectionsData,
      infiniteQueryOptions: {
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
          if (!lastPage.hasMore) return undefined;
          const currentPage = lastPage.page ?? 1;
          return currentPage + 1;
        },
      },
      providesTags: [CACHE_ACCEPTED_CONNECTIONS_INFINITE],
    }),

    // --- Mutations ------------------------------------------------------------

    requestConnection: build.mutation<RequestConnectionResult, RequestConnectionMutationArg>({
      query: ({ targetUserId }) => ({
        url: CONNECTIONS.REQUEST,
        method: "POST",
        body: { targetUserId },
      }),
      invalidatesTags: (_result, _error, arg) => [
        CACHE_CONNECTIONS_LIST,
        CACHE_ACCEPTED_CONNECTIONS_INFINITE,
        CACHE_PENDING_INCOMING_COUNT,
        ...tagsForPublicProfile(arg.invalidatePublicProfileUsername),
      ],
    }),

    acceptConnection: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.accept(connectionId),
        method: "POST",
      }),
      invalidatesTags: invalidateAfterAcceptOrReject,
    }),

    rejectConnection: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.reject(connectionId),
        method: "POST",
      }),
      invalidatesTags: invalidateAfterAcceptOrReject,
    }),

    disconnectConnection: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.disconnect(connectionId),
        method: "POST",
      }),
      invalidatesTags: invalidateAfterDisconnectOrWithdraw,
    }),

    withdrawConnectionRequest: build.mutation<unknown, RespondConnectionMutationArg>({
      query: ({ connectionId }) => ({
        url: CONNECTIONS.withdraw(connectionId),
        method: "POST",
      }),
      invalidatesTags: invalidateAfterDisconnectOrWithdraw,
    }),
  }),
});

export const {
  useGetPendingIncomingConnectionCountQuery,
  useGetMyConnectionsQuery,
  useLazyGetMyConnectionsQuery,
  usePeersCallStatusQuery,
  useAcceptedConnectionsInfiniteQuery,
  useRequestConnectionMutation,
  useAcceptConnectionMutation,
  useRejectConnectionMutation,
  useDisconnectConnectionMutation,
  useWithdrawConnectionRequestMutation,
} = connectionsApi;
