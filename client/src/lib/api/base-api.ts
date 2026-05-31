import { API_BASE_URL } from '@/shared/constants/environments'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL, credentials: 'include' }),
  endpoints: () => ({}),
  tagTypes: [
    'AccountSession',
    'ProfileSetupSteps',
    'ProfileMe',
    'Connections',
    'CircleCategories',
    'ActiveCircles',
    'RtcToken',
    'Room',
    'RoomEmbeddedActivities',
    'PublicProfile',
    'Notifications',
    'MatchPrepPrompt',
    'MatchPeerPreview',
    'Conversations',
    'Messages',
    'Blocks',
    'Presence',
    'ExploreSuggestedPeople',
    'ExploreBrowseNiches',
    'ExploreBrowseNicheRooms',
  ],
})
