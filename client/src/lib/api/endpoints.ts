export const API_ENDPOINTS = {
  PROFILE: {
    ME: "/profile/me",
    SETUP_STEPS: "/profile/setup-steps",
    PROFILE_SETUP: "/profile/profile-setup",
    ONBOARDING_STATUS: "/profile/onboarding-status",
    /** Who can add you when creating a room with friend invites */
    ROOM_INVITE_SETTINGS: "/profile/room-invite-settings",
    /** Presigned PUT to DigitalOcean Spaces; then save `publicUrl` via profile-setup step 6 */
    PHOTOS_PRESIGN: "/profile/photos/presign",
    MATCH_PREP_CURRENT: "/profile/match-prep/current",
    MATCH_PREP_OPTIONS: "/profile/match-prep/options",
    MATCH_PREP_PROMPT_STATUS: "/profile/match-prep/prompt-status",
    LOCATION_SUGGESTIONS: "/profile/location/suggestions",
    LOCATION_GEOCODE: "/profile/location/geocode",
    LOCATION_REVERSE_GEOCODE: "/profile/location/reverse-geocode",
    MATCH_PREP: "/profile/match-prep",
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
    PEERS_CALL_STATUS: "/connections/peers-call-status",
    PENDING_INCOMING_COUNT: "/connections/pending-incoming-count",
    REQUEST: "/connections/request",
    accept: (connectionId: string) =>
      `/connections/${encodeURIComponent(connectionId)}/accept` as const,
    reject: (connectionId: string) =>
      `/connections/${encodeURIComponent(connectionId)}/reject` as const,
    disconnect: (connectionId: string) =>
      `/connections/${encodeURIComponent(connectionId)}/disconnect` as const,
    withdraw: (connectionId: string) =>
      `/connections/${encodeURIComponent(connectionId)}/withdraw` as const,
  },
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    READ_ALL: "/notifications/read-all",
    markRead: (notificationId: string) =>
      `/notifications/${encodeURIComponent(notificationId)}/read` as const,
  },
  SEARCH: {
    USERS: "/search/users",
  },
  CIRCLES: {
    CATEGORIES: "/circles/categories",
    CREATE: "/circles",
    ACTIVE: "/circles/active",
  },
  CHAT: {
    CONVERSATIONS:        '/chat/conversations',
    CONVERSATIONS_CONNECTION: '/chat/conversations/connection',
    conversation: (id: string) => `/chat/conversations/${encodeURIComponent(id)}` as const,
    messages:     (id: string) => `/chat/conversations/${encodeURIComponent(id)}/messages` as const,
    persistence:  (id: string) => `/chat/conversations/${encodeURIComponent(id)}/persistence` as const,
    deleteMessage: (id: string) => `/chat/messages/${encodeURIComponent(id)}` as const,
    pinMessage:   (id: string) => `/chat/messages/${encodeURIComponent(id)}/pin` as const,
    REPORT:       '/chat/report',
  },
  ROOM: {
    start: (roomId: string) => `/room/${roomId}/start` as const,
    get: (roomId: string) => `/room/${roomId}` as const,
    join: (roomId: string) => `/room/${roomId}/join` as const,
    rtcToken: (roomId: string) => `/room/${roomId}/rtc-token` as const,
    expandDirectInvite: (roomId: string) => `/room/${roomId}/expand-direct/invite` as const,
    expandDirectRespond: (roomId: string) => `/room/${roomId}/expand-direct/respond` as const,
    chessInvite: (roomId: string) => `/room/${roomId}/activity/chess/invite` as const,
    chessRespond: (roomId: string) => `/room/${roomId}/activity/chess/respond` as const,
    chessEnd: (roomId: string) => `/room/${roomId}/activity/chess/end` as const,
  },
}
