export const API_ENDPOINTS = {
  ACCOUNT: {
    /** Better Auth plugin: update signed-in user phone after Firebase SMS verification. */
    FIREBASE_PHONE_UPDATE: "/auth/firebase-phone-update",
  },
  PROFILE: {
    ME: "/profile/me",
    SETUP_STEPS: "/profile/setup-steps",
    PROFILE_SETUP: "/profile/profile-setup",
    ONBOARDING_STATUS: "/profile/onboarding-status",
    /** Who can add you when creating a room with friend invites */
    ROOM_INVITE_SETTINGS: "/profile/room-invite-settings",
    /** Presigned PUT to DigitalOcean Spaces; call PHOTOS_ENSURE_PUBLIC after PUT so objects are readable. */
    PHOTOS_PRESIGN: "/profile/photos/presign",
    PHOTOS_ENSURE_PUBLIC: "/profile/photos/ensure-public",
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
    /** Same path for PATCH (update) and DELETE (remove) — method differs per request. */
    room: (roomId: string) => `/circles/${encodeURIComponent(roomId)}` as const,
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
    /** Config rows for in-call embedded activities (`room_embedded_activities`). */
    EMBEDDED_ACTIVITIES: "/room/embedded-activities" as const,
    start: (roomId: string) => `/room/${roomId}/start` as const,
    get: (roomId: string) => `/room/${roomId}` as const,
    join: (roomId: string) => `/room/${roomId}/join` as const,
    openMeeting: (roomId: string) => `/room/${roomId}/open-meeting` as const,
    leaveCircleRtc: (roomId: string) => `/room/${roomId}/leave-circle-rtc` as const,
    hostEndCircleForEveryone: (roomId: string) =>
      `/room/${roomId}/host-end-circle` as const,
    /** @deprecated Prefer `hostEndCircleForEveryone` — same handler, legacy path. */
    hostEndDeleteAfterCall: (roomId: string) =>
      `/room/${roomId}/host-end-delete-after-call` as const,
    updateTitle: (roomId: string) => `/room/${roomId}/title` as const,
    rtcToken: (roomId: string) => `/room/${roomId}/rtc-token` as const,
    invite: (roomId: string) => `/room/${roomId}/invite` as const,
    inviteRespond: (roomId: string) => `/room/${roomId}/invite/respond` as const,
    expandDirectInvite: (roomId: string) => `/room/${roomId}/expand-direct/invite` as const,
    expandDirectRespond: (roomId: string) => `/room/${roomId}/expand-direct/respond` as const,
    chessInvite: (roomId: string) => `/room/${roomId}/activity/chess/invite` as const,
    chessRespond: (roomId: string) => `/room/${roomId}/activity/chess/respond` as const,
    chessEnd: (roomId: string) => `/room/${roomId}/activity/chess/end` as const,
    chessMove: (roomId: string) => `/room/${roomId}/activity/chess/move` as const,
    chessDrawOffer: (roomId: string) => `/room/${roomId}/activity/chess/draw-offer` as const,
    chessDrawRespond: (roomId: string) => `/room/${roomId}/activity/chess/draw-respond` as const,
  },
}
