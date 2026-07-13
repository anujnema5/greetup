'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';

import { invalidateNotificationCaches } from '../lib/invalidate-notification-caches';

const { NOTIFICATIONS } = API_ENDPOINTS;

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId }: { notificationId: string }) =>
      apiFetch<unknown>(NOTIFICATIONS.markRead(notificationId), {
        method: 'POST',
      }),
    onSuccess: () => {
      invalidateNotificationCaches(qc);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<unknown>(NOTIFICATIONS.READ_ALL, {
        method: 'POST',
      }),
    onSuccess: () => {
      invalidateNotificationCaches(qc);
    },
  });
}
