export const API_ENDPOINTS = {
  PROFILE: {
    ME: "/profile/me",
    SETUP_STEPS: "/profile/setup-steps",
    PROFILE_SETUP: "/profile/profile-setup",
    ONBOARDING_STATUS: "/profile/onboarding-status",
    /** Who can add you when creating a room with friend invites */
    ROOM_INVITE_SETTINGS: "/profile/room-invite-settings",
    public: (username: string) =>
      `/profile/public/${encodeURIComponent(username)}` as const,
  },
  MATCHING: {
    FIND: "/matching/find",
    CANCEL: "/matching/cancel",
    RESPOND: "/matching/respond",
    LEAVE_ROOM: "/matching/leave-room",
    peerPreview: (peerUserId: string) =>
      `/matching/peer-preview/${encodeURIComponent(peerUserId)}` as const,
  },
  CONNECTIONS: {
    LIST: "/connections",
    REQUEST: "/connections/request",
    accept: (connectionId: string) =>
      `/connections/${encodeURIComponent(connectionId)}/accept` as const,
    reject: (connectionId: string) =>
      `/connections/${encodeURIComponent(connectionId)}/reject` as const,
  },
  SEARCH: {
    USERS: "/search/users",
  },
  CIRCLES: {
    CATEGORIES: "/circles/categories",
    CREATE: "/circles",
    ACTIVE: "/circles/active",
  },
  ROOM: {
    start: (roomId: string) => `/room/${roomId}/start` as const,
    get: (roomId: string) => `/room/${roomId}` as const,
    join: (roomId: string) => `/room/${roomId}/join` as const,
    rtcToken: (roomId: string) => `/room/${roomId}/rtc-token` as const,
  },
}
