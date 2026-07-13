'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import { getRtcTokenStaleTimeMs } from '@/features/rtc/lib/rtc-token-cache';
import { rtcMark } from '@/features/rtc/lib/rtc-connect-timing';

import type { RtcTokenPayload } from '../types/rtc-api.types';

const { ROOM } = API_ENDPOINTS;

type UseRtcTokenOptions = {
  enabled?: boolean;
};

async function fetchRtcToken(roomId: string): Promise<RtcTokenPayload> {
  rtcMark('token-start');
  const data = await apiFetch<RtcTokenPayload | null | undefined>(ROOM.rtcToken(roomId));
  if (!data?.token) {
    throw new Error('Could not get RTC token');
  }
  rtcMark('token-ready');
  return data;
}

export function useRtcToken(roomId: string, options?: UseRtcTokenOptions) {
  return useQuery({
    queryKey: queryKeys.rtc.token(roomId),
    queryFn: () => fetchRtcToken(roomId),
    enabled: (options?.enabled ?? true) && Boolean(roomId),
    staleTime: getRtcTokenStaleTimeMs(),
    gcTime: getRtcTokenStaleTimeMs(),
  });
}
