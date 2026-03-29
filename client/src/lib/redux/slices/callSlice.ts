import { createSlice } from '@reduxjs/toolkit'

interface CallState {
  isActive: boolean
}

const initialState: CallState = {
  isActive: false,
}

export const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    startCall: (state) => { state.isActive = true  },
    endCall:   (state) => { state.isActive = false },
  },
})

export const { startCall, endCall } = callSlice.actions
export default callSlice.reducer
