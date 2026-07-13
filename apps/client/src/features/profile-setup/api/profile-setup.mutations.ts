'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import type { MyProfileResponse } from '@/features/profile/types/my-profile.types';

import {
  invalidateAfterRoomInviteSettings,
  invalidateAfterSaveMatchPrep,
  invalidateAfterSaveProfile,
} from '../lib/invalidate-profile-setup-caches';
import type {
  PresignProfilePhotoData,
  ResolvedLocationData,
  SaveProfileSetupPayload,
  SaveProfileSetupResponse,
} from '../types/profile-setup-api.types';

const { PROFILE } = API_ENDPOINTS;

export type RoomInviteSettingsPayload = {
  policy: 'all_connections' | 'selected_only';
  allowlistedUserIds: string[];
};

export type RoomInviteSettingsData = MyProfileResponse['roomInvite'];

export type SaveMatchPrepBody = {
  matchIntent?: "quick" | "activity";
  activitySelections?: Array<{ activityId: string; detail?: string | null }>;
  moodIds: string[];
  lookingForIds: string[];
  interestIds: string[];
  sessionGoal?: string | null;
  connectionPreference?: 'same_profession' | 'different_profession' | 'open_to_anyone';
  locationPreferenceEnabled?: boolean;
  distancePreference?: 'random' | 'same_city' | 'same_country' | 'global';
  location?: {
    country: string;
    countryCode: string;
    region?: string;
    regionCode?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    source?: 'current' | 'manual';
  };
  clientSessionId?: string;
};

export function useSaveProfileSetup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: SaveProfileSetupPayload) =>
      apiFetch<SaveProfileSetupResponse>(PROFILE.PROFILE_SETUP, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateAfterSaveProfile(qc);
    },
  });
}

export function useUpdateRoomInviteSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: RoomInviteSettingsPayload) =>
      apiFetch<RoomInviteSettingsData>(PROFILE.ROOM_INVITE_SETTINGS, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateAfterRoomInviteSettings(qc);
    },
  });
}

export function usePresignProfilePhoto() {
  return useMutation({
    mutationFn: (body: { contentType: string; contentLength: number }) =>
      apiFetch<PresignProfilePhotoData>(PROFILE.PHOTOS_PRESIGN, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useEnsureProfilePhotoPublic() {
  return useMutation({
    mutationFn: (body: { publicUrl: string }) =>
      apiFetch<{ ok: boolean }>(PROFILE.PHOTOS_ENSURE_PUBLIC, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}

export function useGeocodeLocation() {
  return useMutation({
    mutationFn: async (body: { query: string }) => {
      const data = await apiFetch<ResolvedLocationData | null | undefined>(
        PROFILE.LOCATION_GEOCODE,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      if (!data) {
        throw new Error('Could not resolve location');
      }
      return data;
    },
  });
}

export function useReverseGeocodeLocation() {
  return useMutation({
    mutationFn: async (body: { latitude: number; longitude: number }) => {
      const data = await apiFetch<ResolvedLocationData | null | undefined>(
        PROFILE.LOCATION_REVERSE_GEOCODE,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      );
      if (!data) {
        throw new Error('Could not resolve location');
      }
      return data;
    },
  });
}

export function useSaveMatchPrep() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: SaveMatchPrepBody) =>
      apiFetch<{ ok: boolean }>(PROFILE.MATCH_PREP, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateAfterSaveMatchPrep(qc);
    },
  });
}
