import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type { UpdateAccountPhoneBody } from "../schemas/change-phone.schemas";
import type { UpdateAccountPhoneResponse } from "../types/account-settings-api.types";

const { ACCOUNT } = API_ENDPOINTS;

/**
 * Account / security settings backed by the Hono API (`baseApi` → `NEXT_PUBLIC_API_BASE_URL`).
 */
export const accountSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateAccountPhone: builder.mutation<UpdateAccountPhoneResponse, UpdateAccountPhoneBody>({
      query: (body) => ({
        url: ACCOUNT.FIREBASE_PHONE_UPDATE,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useUpdateAccountPhoneMutation } = accountSettingsApi;
