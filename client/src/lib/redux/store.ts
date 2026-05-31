import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '@/lib/api/base-api'
import '@/features/settings/api/account-settings-api'
import '@/features/tour-guide/api/tour-guide-api'
import roomReducer from './slices/room-slice'
import roomActivityReducer from './slices/room-activity-slice'
import connectionCallReducer from '@/features/connection-call/slices/connection-call.slice'
import chatReducer from '@/features/chat/slices/chat.slice'
import connectionRealtimeSyncReducer from '@/features/connections/state/connection-realtime-sync-slice'

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        room: roomReducer,
        roomActivity: roomActivityReducer,
        chat: chatReducer,
        connectionCall: connectionCallReducer,
        connectionRealtimeSync: connectionRealtimeSyncReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch