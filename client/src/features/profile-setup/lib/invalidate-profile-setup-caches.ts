import type { QueryClient } from '@tanstack/react-query';

import { invalidateSuggestedPeopleCache } from '@/features/explore/lib/invalidate-suggested-people-cache';
import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateAfterSaveProfile(qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.steps });
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.onboardingStatus });
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.myProfile });
  invalidateSuggestedPeopleCache(qc);
}

export function invalidateAfterSaveMatchPrep(qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.myProfile });
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.matchPrepCurrent });
  void qc.invalidateQueries({ queryKey: ['profile-setup', 'match-prep-prompt'] });
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.steps });
  invalidateSuggestedPeopleCache(qc);
}

export function invalidateAfterRoomInviteSettings(qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.profileSetup.myProfile });
}
