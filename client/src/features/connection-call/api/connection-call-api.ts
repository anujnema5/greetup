import { API_ENDPOINTS, baseApi } from '@/lib/api';
import type { ApiResponse } from '@/features/profile-setup/types/profile-setup-api.types';
import type {
  ConnectionCallInitiateResult,
  ConnectionCallMode,
  ConnectionCallRespondResult,
} from '../types/connection-call.types';

const { CONNECTIONS } = API_ENDPOINTS;

type InitiateArg = {
  conversationId: string;
  mode: ConnectionCallMode;
};

type RespondArg = {
  requestId: string;
  accept: boolean;
};

type CancelArg = {
  requestId: string;
  reason?: 'cancelled' | 'no_answer';
};

type MissedArg = {
  requestId: string;
};

function unwrapInitiate(res: ApiResponse<ConnectionCallInitiateResult>): ConnectionCallInitiateResult {
  if (!res.success || !res.data) {
    throw new Error(res.message ?? 'Could not start call');
  }
  return res.data;
}

function unwrapRespond(res: ApiResponse<ConnectionCallRespondResult>): ConnectionCallRespondResult {
  if (!res.success || !res.data) {
    throw new Error(res.message ?? 'Could not respond to call');
  }
  return res.data;
}

export const connectionCallApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    initiateConnectionCall: build.mutation<ConnectionCallInitiateResult, InitiateArg>({
      query: (body) => ({
        url: CONNECTIONS.CALLS,
        method: 'POST',
        body,
      }),
      transformResponse: unwrapInitiate,
    }),

    respondConnectionCall: build.mutation<ConnectionCallRespondResult, RespondArg>({
      query: ({ requestId, accept }) => ({
        url: CONNECTIONS.callRespond(requestId),
        method: 'POST',
        body: { accept },
      }),
      transformResponse: unwrapRespond,
    }),

    cancelConnectionCall: build.mutation<{ cancelled: boolean }, CancelArg>({
      query: ({ requestId, reason }) => ({
        url: CONNECTIONS.callCancel(requestId),
        method: 'POST',
        body: reason ? { reason } : {},
      }),
      transformResponse: (res: ApiResponse<{ cancelled: boolean }>) => {
        if (!res.success) throw new Error(res.message ?? 'Could not cancel call');
        return res.data ?? { cancelled: true };
      },
    }),

    markConnectionCallMissed: build.mutation<{ missed: boolean }, MissedArg>({
      query: ({ requestId }) => ({
        url: CONNECTIONS.callMissed(requestId),
        method: 'POST',
      }),
      transformResponse: (res: ApiResponse<{ missed: boolean }>) => {
        if (!res.success) throw new Error(res.message ?? 'Could not mark call missed');
        return res.data ?? { missed: true };
      },
    }),
  }),
});

export const {
  useInitiateConnectionCallMutation,
  useRespondConnectionCallMutation,
  useCancelConnectionCallMutation,
  useMarkConnectionCallMissedMutation,
} = connectionCallApi;
