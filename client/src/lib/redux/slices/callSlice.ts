import { createSlice } from '@reduxjs/toolkit'

interface CallState {
  isActive: boolean
  isMinimized: boolean
}

const initialState: CallState = {
  isActive: false,
  isMinimized: false,
}

export const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    startCall: (state) => {
      state.isActive = true
      state.isMinimized = false
    },
    endCall: (state) => {
      state.isActive = false
      state.isMinimized = false
    },
    minimizeCall: (state) => {
      state.isMinimized = true
    },
    expandCall: (state) => {
      state.isMinimized = false
    },
  },
})

export const { startCall, endCall, minimizeCall, expandCall } = callSlice.actions
export default callSlice.reducer
