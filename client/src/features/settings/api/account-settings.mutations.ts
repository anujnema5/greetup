'use client';

import { useMutation } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';

import type { UpdateAccountPhoneBody } from '../schemas/change-phone.schemas';
import type { UpdateAccountPhoneResponse } from '../types/account-settings-api.types';

const { ACCOUNT } = API_ENDPOINTS;

export function useUpdateAccountPhone() {
  return useMutation({
    mutationFn: (body: UpdateAccountPhoneBody) =>
      apiFetch<UpdateAccountPhoneResponse>(ACCOUNT.FIREBASE_PHONE_UPDATE, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
