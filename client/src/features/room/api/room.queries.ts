'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { parseRoomData, type RoomData } from '@/features/matching/types/room.types';
import { parseListRoomEmbeddedActivitiesResponse } from '@/features/room/embedded-activities/parse/parse-list-response';
import type { RoomEmbeddedActivityDto } from '@/features/room/embedded-activities/types';

import { roomApiEnvelope } from '../lib/room-api-fetch';

const { ROOM } = API_ENDPOINTS;

type UseGetRoomOptions = {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

async function fetchRoom(roomId: string): Promise<RoomData> {
  const json = await roomApiEnvelope<unknown>(ROOM.get(roomId));
  if (!json.success || json.data == null) {
    throw new Error(json.message ?? 'Room not found');
  }
  return parseRoomData(json.data);
}

async function fetchRoomEmbeddedActivities(): Promise<RoomEmbeddedActivityDto[]> {
  const json = await roomApiEnvelope<RoomEmbeddedActivityDto[]>(ROOM.EMBEDDED_ACTIVITIES);
  return parseListRoomEmbeddedActivitiesResponse(json);
}

/** GET `/room/:roomId` — Redis match pair or DB room metadata. */
export function useGetRoom(roomId: string, options?: UseGetRoomOptions) {
  return useQuery({
    queryKey: queryKeys.room.detail(roomId),
    queryFn: () => fetchRoom(roomId),
    enabled: (options?.enabled ?? true) && Boolean(roomId),
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
  });
}

export function useRoomEmbeddedActivities(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.room.embeddedActivities,
    queryFn: fetchRoomEmbeddedActivities,
    enabled: options?.enabled ?? true,
  });
}
