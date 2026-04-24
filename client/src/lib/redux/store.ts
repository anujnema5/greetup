import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '@/lib/api/base-api'
import '@/features/settings/api/account-settings-api'
import roomReducer from './slices/roomSlice'
import chatReducer from '@/features/chat/slices/chat.slice'

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        room: roomReducer,
        chat: chatReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch