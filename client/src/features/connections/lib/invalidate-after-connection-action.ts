import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';
import type { PublicProfileConnectionState } from '@/features/user-profile/types/public-profile.types';

import { invalidateMigratedConnectionQueryCaches } from './invalidate-migrated-connection-query-caches';

type ConnectionMutationCacheArg = {
  peerUsername?: string | null;
  invalidatePublicProfileUsername?: string | null;
  peerUserId?: string | null;
  targetUserId?: string | null;
};

export function invalidateConnectionListCaches(
  qc: QueryClient,
  _connectionState: PublicProfileConnectionState,
) {
  void qc.invalidateQueries({ queryKey: queryKeys.connections.all });
}

export function invalidateAfterRequestConnection(
  qc: QueryClient,
  arg: ConnectionMutationCacheArg,
) {
  invalidateMigratedConnectionQueryCaches(arg, qc);
  void qc.invalidateQueries({ queryKey: queryKeys.connections.all });
}

export function invalidateAfterAcceptOrRejectConnection(
  qc: QueryClient,
  arg: ConnectionMutationCacheArg,
) {
  invalidateMigratedConnectionQueryCaches(arg, qc);
  void qc.invalidateQueries({ queryKey: queryKeys.connections.all });
}

export function invalidateAfterDisconnectOrWithdraw(
  qc: QueryClient,
  arg: ConnectionMutationCacheArg,
) {
  invalidateMigratedConnectionQueryCaches(arg, qc);
  void qc.invalidateQueries({ queryKey: queryKeys.connections.all });
}

export function invalidateConnectionListCachesDefault(
  connectionState: PublicProfileConnectionState,
) {
  invalidateConnectionListCaches(queryClient, connectionState);
}
