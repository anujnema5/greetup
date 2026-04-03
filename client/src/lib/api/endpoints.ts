export const API_ENDPOINTS = {
  PROFILE: {
    ME: "/profile/me",
    SETUP_STEPS: "/profile/setup-steps",
    PROFILE_SETUP: "/profile/profile-setup",
    ONBOARDING_STATUS: "/profile/onboarding-status",
    /** Who can add you when creating a room with friend invites */
    ROOM_INVITE_SETTINGS: "/profile/room-invite-settings",
  },
  MATCHING: {
    FIND: "/matching/find",
    CANCEL: "/matching/cancel",
    LEAVE_ROOM: "/matching/leave-room",
  },
  CONNECTIONS: {
    LIST: "/connections",
  },
  CIRCLES: {
    CATEGORIES: "/circles/categories",
    CREATE: "/circles",
    ACTIVE: "/circles/active",
  },
  ROOM: {
    start: (roomId: string) => `/room/${roomId}/start` as const,
    get: (roomId: string) => `/room/${roomId}` as const,
    rtcToken: (roomId: string) => `/room/${roomId}/rtc-token` as const,
  },
}
