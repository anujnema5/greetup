export const queryKeys = {
  presence: {
    onlineCount: ['presence', 'online-count'] as const,
  },
  blocks: {
    all: ['blocks'] as const,
    list: ['blocks', 'list'] as const,
  },
  connections: {
    all: ['connections'] as const,
    list: (args: { filter?: string; page?: number; limit?: number; q?: string }) =>
      [
        'connections',
        'list',
        args.filter ?? 'accepted',
        args.page ?? '',
        args.limit ?? '',
        args.q ?? '',
      ] as const,
    acceptedInfinite: (limit: number, q?: string) =>
      ['connections', 'accepted', limit, q ?? ''] as const,
    pendingCount: ['connections', 'pending-count'] as const,
    peersCallStatus: (userIds: readonly string[]) =>
      ['connections', 'call-status', userIds] as const,
  },
  chat: {
    all: ['chat'] as const,
    conversations: ['chat', 'conversations'] as const,
    conversation: (id: string) => ['chat', 'conversation', id] as const,
    messages: (conversationId: string) => ['chat', 'messages', conversationId] as const,
  },
  tourGuide: {
    welcomeStatus: ['tour-guide', 'welcome-status'] as const,
  },
  profile: {
    insightsAll: ['profile', 'insights'] as const,
    insights: (recentLimit?: number) =>
      ['profile', 'insights', recentLimit ?? 'default'] as const,
  },
  publicProfile: {
    all: ['public-profile'] as const,
    byUsername: (username: string) => ['public-profile', username] as const,
  },
  rtc: {
    all: ['rtc'] as const,
    token: (roomId: string) => ['rtc', 'token', roomId] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (page: number, limit: number, unreadOnly: boolean) =>
      ['notifications', 'list', page, limit, unreadOnly] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  explore: {
    browseNiches: ['explore', 'browse-niches'] as const,
    browseNicheRooms: (categoryId: string, cursor: string, limit: number) =>
      ['explore', 'browse-niche-rooms', categoryId, cursor, limit] as const,
    searchUsers: (q: string, limit: number) => ['explore', 'search-users', q, limit] as const,
    suggestedPeople: ['explore', 'suggested-people'] as const,
  },
  profileSetup: {
    all: ['profile-setup'] as const,
    steps: ['profile-setup', 'steps'] as const,
    myProfile: ['profile-setup', 'my-profile'] as const,
    matchPrepCurrent: ['profile-setup', 'match-prep-current'] as const,
    matchPrepOptions: ['profile-setup', 'match-prep-options'] as const,
    matchPrepPrompt: (clientSessionId: string) =>
      ['profile-setup', 'match-prep-prompt', clientSessionId] as const,
    locationSuggestions: (query: string, limit: number) =>
      ['profile-setup', 'location-suggestions', query, limit] as const,
  },
  matching: {
    all: ['matching'] as const,
    peerPreview: (peerUserId: string) => ['matching', 'peer-preview', peerUserId] as const,
  },
  connectionCall: {
    all: ['connection-call'] as const,
  },
  spaces: {
    all: ['spaces'] as const,
    categories: ['spaces', 'categories'] as const,
    activityOptions: ['spaces', 'activity-options'] as const,
    active: (args: { cursor?: string; limit?: number }) =>
      ['spaces', 'active', args.cursor ?? '', args.limit ?? ''] as const,
    browseInfinite: (limit: number) => ['spaces', 'browse', limit] as const,
  },
  room: {
    all: ['room'] as const,
    detail: (roomId: string) => ['room', 'detail', roomId] as const,
    embeddedActivities: ['room', 'embedded-activities'] as const,
  },
  guestTry: {
    all: ['guest-try'] as const,
    status: ['guest-try', 'status'] as const,
    signupContext: ['guest-try', 'signup-context'] as const,
  },
  openToConnect: {
    all: ['open-to-connect'] as const,
    me: ['open-to-connect', 'me'] as const,
    feed: (args: { activityId?: string; interestId?: string }) =>
      ['open-to-connect', 'feed', args.activityId ?? '', args.interestId ?? ''] as const,
    feedInfinite: (args: { activityId?: string; interestId?: string }) =>
      ['open-to-connect', 'feed-infinite', args.activityId ?? '', args.interestId ?? ''] as const,
    sidebar: (args: { activityId?: string; interestId?: string }) =>
      ['open-to-connect', 'sidebar', args.activityId ?? '', args.interestId ?? ''] as const,
    inboundRequests: ['open-to-connect', 'connect-requests', 'inbound'] as const,
    outboundRequests: ['open-to-connect', 'connect-requests', 'outbound'] as const,
    searchSuggestions: ['open-to-connect', 'search-suggestions'] as const,
  },
} as const;
