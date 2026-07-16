export const API_ENDPOINTS = {
  GUEST: {
    STATUS: "/guest/status",
    SIGNUP_CONTEXT: "/guest/signup-context",
    CREATE_SESSION: "/auth/guest",
    PROFILE: "/guest/profile",
    MATCH_PREP: "/guest/match-prep",
  },
  AUTH: {
    /** Server-side phone OTP over AWS SNS (Better Auth `phone-otp` plugin). */
    PHONE_OTP_START: "/auth/phone-otp/start",
    PHONE_OTP_VERIFY: "/auth/phone-otp/verify",
    PHONE_OTP_UPDATE_START: "/auth/phone-otp/update/start",
    PHONE_OTP_UPDATE_VERIFY: "/auth/phone-otp/update/verify",
  },
  PROFILE: {
    ME: "/profile/me",
    ME_INSIGHTS: "/profile/me/insights",
    SETUP_STEPS: "/profile/setup-steps",
    PROFILE_SETUP: "/profile/profile-setup",
    WELCOME_TOUR_STATUS: "/profile/welcome-tour-status",
    WELCOME_TOUR_SEEN: "/profile/welcome-tour-seen",
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
    USERNAME_CHECK: "/profile/username/check",
    USERNAME_SUGGESTIONS: "/profile/username/suggestions",
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
    CALLS: "/connections/calls",
    callRespond: (requestId: string) =>
      `/connections/calls/${encodeURIComponent(requestId)}/respond` as const,
    callCancel: (requestId: string) =>
      `/connections/calls/${encodeURIComponent(requestId)}/cancel` as const,
    callMissed: (requestId: string) =>
      `/connections/calls/${encodeURIComponent(requestId)}/missed` as const,
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
    SUGGESTED_PEOPLE: "/search/suggested-people",
  },
  BLOCKS: {
    LIST: "/blocks",
    user: (targetUserId: string) =>
      `/blocks/${encodeURIComponent(targetUserId)}` as const,
  },
  PROBLEM_REPORTS: {
    CREATE: "/problem-reports",
    /** Presigned PUT to DigitalOcean Spaces for an optional screenshot. */
    SCREENSHOT_UPLOAD_URL: "/problem-reports/screenshot-upload-url",
  },
  PRESENCE: {
    ONLINE_PEOPLE_COUNT: "/presence/online-people-count",
  },
  OPEN_TO_CONNECT: {
    ME: "/open-to-connect/me",
    FEED: "/open-to-connect/feed",
    SIDEBAR: "/open-to-connect/sidebar",
    SUGGESTIONS_FOR_SEARCH: "/open-to-connect/suggestions-for-search",
    ENABLE: "/open-to-connect/enable",
    DISABLE: "/open-to-connect/disable",
  },
  CONNECT_REQUESTS: {
    CREATE: "/connect-requests",
    INBOUND: "/connect-requests/inbound",
    OUTBOUND: "/connect-requests/outbound",
    respond: (id: string) => `/connect-requests/${encodeURIComponent(id)}/respond` as const,
    cancel: (id: string) => `/connect-requests/${encodeURIComponent(id)}/cancel` as const,
  },
  SPACES: {
    CATEGORIES: "/spaces/categories",
    ACTIVITY_OPTIONS: "/spaces/activity-options",
    BROWSE_NICHES: "/spaces/browse/niches",
    browseNicheRooms: (categoryId: string) =>
      `/spaces/browse/niches/${encodeURIComponent(categoryId)}/rooms` as const,
    CREATE: "/spaces",
    ACTIVE: "/spaces/active",
    /** Same path for PATCH (update) and DELETE (remove) — method differs per request. */
    room: (roomId: string) => `/spaces/${encodeURIComponent(roomId)}` as const,
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
    leaveSpaceRtc: (roomId: string) => `/room/${roomId}/leave-space-rtc` as const,
    hostEndSpaceForEveryone: (roomId: string) =>
      `/room/${roomId}/host-end-space` as const,
    kickParticipant: (roomId: string, userId: string) =>
      `/room/${roomId}/kick/${userId}` as const,
    nsfwViolation: (roomId: string) => `/room/${roomId}/nsfw-violation` as const,
    updateTitle: (roomId: string) => `/room/${roomId}/title` as const,
    rtcToken: (roomId: string) => `/room/${roomId}/rtc-token` as const,
    invite: (roomId: string) => `/room/${roomId}/invite` as const,
    inviteRespond: (roomId: string) => `/room/${roomId}/invite/respond` as const,
    conversationCues: (roomId: string) => `/room/${roomId}/conversation-cues` as const,
    chessInvite: (roomId: string) => `/room/${roomId}/activity/chess/invite` as const,
    chessRespond: (roomId: string) => `/room/${roomId}/activity/chess/respond` as const,
    chessEnd: (roomId: string) => `/room/${roomId}/activity/chess/end` as const,
    chessMove: (roomId: string) => `/room/${roomId}/activity/chess/move` as const,
    chessDrawOffer: (roomId: string) => `/room/${roomId}/activity/chess/draw-offer` as const,
    chessDrawRespond: (roomId: string) => `/room/${roomId}/activity/chess/draw-respond` as const,
  },
}
