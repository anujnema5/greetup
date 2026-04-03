import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '@/lib/api/base-api'
import roomReducer from './slices/roomSlice'

export const store = configureStore({
    reducer: {
        [baseApi.reducerPath]: baseApi.reducer,
        room: roomReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch