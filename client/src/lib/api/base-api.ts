import { API_BASE_URL } from '@/shared/constants/environments'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL, credentials: 'include' }),
  endpoints: () => ({}),
  tagTypes: [
    'ProfileSetupSteps',
    'ProfileMe',
    'Connections',
    'CircleCategories',
    'ActiveCircles',
    'RtcToken',
    'PublicProfile',
    'Notifications',
    'MatchPrepPrompt',
    'Conversations',
    'Messages',
  ],
})
