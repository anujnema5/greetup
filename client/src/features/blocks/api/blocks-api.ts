import { API_ENDPOINTS, baseApi } from "@/lib/api";
import { publicProfileApi } from "@/features/user-profile/api/public-profile-api";
import { publicProfileRtkCacheId } from "@/features/user-profile/api/public-profile-rtk-cache";
import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

import { blocksInvalidationTags, CACHE_BLOCKED_USERS_LIST } from "./blocks-invalidation-tags";
import type { BlockedUsersListData, BlockUserMutationArg } from "../types/blocks-api.types";

const { BLOCKS } = API_ENDPOINTS;

function blockedUsersFromEnvelope(res: ApiResponse<BlockedUsersListData>): BlockedUsersListData {
  if (!res.success || !res.data) {
    return { items: [] };
  }
  return res.data;
}

export const blocksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listBlockedUsers: build.query<BlockedUsersListData, void>({
      query: () => BLOCKS.LIST,
      transformResponse: blockedUsersFromEnvelope,
      providesTags: [CACHE_BLOCKED_USERS_LIST],
    }),

    blockUser: build.mutation<{ ok: true }, BlockUserMutationArg>({
      query: ({ targetUserId }) => ({
        url: BLOCKS.LIST,
        method: "POST",
        body: { targetUserId },
      }),
      invalidatesTags: (_result, _error, arg) =>
        blocksInvalidationTags({
          peerUsername: arg.peerUsername,
          conversationId: arg.conversationId,
        }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          const username = arg.peerUsername?.trim();
          if (!username) return;
          dispatch(
            publicProfileApi.util.invalidateTags([
              { type: "PublicProfile", id: publicProfileRtkCacheId(username) },
            ]),
          );
        } catch {
          /* block failed — leave cache unchanged */
        }
      },
    }),

    unblockUser: build.mutation<{ ok: true }, BlockUserMutationArg>({
      query: ({ targetUserId }) => ({
        url: BLOCKS.user(targetUserId),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) =>
        blocksInvalidationTags({
          peerUsername: arg.peerUsername,
          conversationId: arg.conversationId,
        }),
    }),
  }),
});

export const {
  useListBlockedUsersQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
} = blocksApi;
