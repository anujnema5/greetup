/** Shared product copy — plain language, user-first. */

export const EARLY_RELEASE = {
  badge: "Early beta",
  notice:
    "We're in early beta and just getting started. Join now, try matching and circles, and help us build something real.",
  noticeShort:
    "We're in early beta and just getting started. Join now, try matching and circles, and help us build something real.",
} as const;

export const DASHBOARD_GREETING_SUBTITLE =
  "Match with someone new, message friends, or join a live circle." as const;

export const DASHBOARD_HERO = {
  onlineBadge: (count: number) =>
    count === 1 ? "1 person online now" : `${count.toLocaleString()} people online now`,
  matchLabel: "Match",
  circleLabel: "Circle",
  cancelSearch: "Cancel search",
  aiCuesComingSoon: "Conversation cues coming soon",
  idle: {
    heading: "Find people you want to talk to, live",
    subtitle:
      "Share how you feel, get matched one-on-one, or join a group circle.",
  },
  searching: {
    heading: "Finding a match…",
    subtitle: "This usually takes a moment. You can cancel anytime.",
  },
  proposed: {
    heading: "You have a match",
    subtitle:
      "Tap Connect if you want to stay in touch. You can message now; connect to call them later.",
  },
  stats: {
    matches: (count: number) => (count === 1 ? "match" : "matches"),
    profileComplete: "profile complete",
  },
} as const;

export const DASHBOARD_SECTIONS = {
  activeNow: {
    title: "Active now",
    empty: "No circles are live right now.",
    seeAll: "See all",
  },
  recentMatches: {
    title: "Recent matches",
    empty: "No matches yet. Tap Find Match to build your match history.",
    seeAll: "See all",
  },
  recentConnections: {
    title: "Recent connections",
    empty: "No connections yet. Tap Connect after a match to add someone here.",
    seeAll: "See all",
  },
  changePreferences: "Change match preferences",
  startCircle: "Start a circle",
} as const;

export const RECENT_MATCHES = {
  dialogTitle: "Recent matches",
  dialogDescription: "Everyone you've matched with on Find Match, newest first, connected or not.",
  emptyTitle: "No matches yet",
  emptyBody: "Tap Find Match on Home to meet someone new.",
  goToHome: "Go to Home",
  matchedOn: "Met on Greetup",
} as const;

export const PROFILE_SECTIONS = {
  recentMatches: {
    title: "Recent matches",
    seeAll: "See all",
  },
  connections: {
    emptyLong:
      "No connections yet. When you connect with someone, they will show up here.",
  },
} as const;

export const CIRCLES_HOME = {
  title: "Active circles",
  subtitle: "Live right now",
  viewAll: "View all",
  emptyPrefix: "Nothing live right now.",
  exploreLink: "Browse circles",
} as const;

export const CONNECTIONS = {
  requestActions: {
    connect: "Connect",
    sending: "Sending…",
    requested: "Requested",
    withdraw: "Withdraw",
    withdrawing: "Withdrawing…",
    connected: "Connected",
  },
} as const;

export const EXPLORE = {
  browseNiches: {
    title: "Browse circles by niche",
    subtitle: "Live circles happening now and scheduled ones you can join",
    groupCounts: (live: number, scheduled: number) => {
      const parts: string[] = [];
      if (live > 0) parts.push(live === 1 ? "1 live" : `${live} live`);
      if (scheduled > 0) parts.push(scheduled === 1 ? "1 scheduled" : `${scheduled} scheduled`);
      if (parts.length === 0) return "No circles yet";
      return parts.join(" · ");
    },
    loading: "Loading niches…",
    error: "Could not load niches. Pull to refresh or try again.",
    empty: "No niches yet. Check back after categories are set up.",
    modalTitle: (niche: string) => `Circles in ${niche}`,
    modalSubtitle: "Live now and scheduled. Tap Join to enter the room or lobby",
    modalSectionLive: "Live now",
    modalSectionScheduled: "Scheduled",
    modalLoading: "Loading circles…",
    modalError: "Could not load circles for this niche.",
    modalEmpty: "No live or scheduled circles in this niche yet. Start one from Home.",
    join: "Join",
    live: "Live",
    scheduled: "Scheduled",
    seatsInRoom: (n: number, max: number) =>
      n === 1 ? `1/${max} in room now` : `${n}/${max} in room now`,
    seatsWhenScheduled: (max: number) => `Up to ${max} seats when live`,
    noOneInRoomYet: "No one in the room yet",
  },
  peopleLikeYou: {
    title: "People like you",
    subtitleWithInterests:
      "Based on your interests: people with a similar vibe you can connect with.",
    subtitleNoInterests:
      "Add interests on your profile to see people in your niche.",
    emptyNoMatches: "No one in your niche yet. Try adding more interests to your profile.",
    editProfile: "Edit profile",
    endOfList: "That's everyone in your niche for now.",
    loading: "Finding people in your niche…",
    error: "Could not load suggestions. Try again in a moment.",
  },
} as const;

/** Client messages for guest-session API error codes. */
export const GUEST_TRIAL_API_ERRORS = {
  GUEST_TRIAL_EXHAUSTED:
    "Your guest try is complete. Create an account or log in to keep matching.",
  GUEST_TRIAL_ALREADY_USED:
    "This device has already been used for a guest try. Create an account or log in to continue.",
  GUEST_RATE_LIMITED:
    "Too many attempts from this network. Try again later or sign up.",
  GUEST_PROFILE_INCOMPLETE:
    "Complete your name and matching preferences before searching.",
  GUEST_NOT_ALLOWED: "Sign up or log in to use that feature.",
  GUEST_SESSION_REQUIRED: "Your session expired. Go back and start again.",
  GUEST_SEARCH_RETRY_EXHAUSTED:
    "You've reached the search limit for now. Sign up or log in to keep matching.",
} as const;

export const GUEST_TRIAL_NAV = {
  goBack: "Go back",
  goBackHome: "Back to home",
  logIn: "Log in",
  continue: "Continue",
  tryAgain: "Try again",
} as const;

export const GUEST_TRIAL_FLOW = {
  tagline: "Meet someone new — jump in without creating an account.",
  completeHeadline: "Want more matches?",
  completeSubheadline: "Create your account and continue.",
  loading: {
    boot: "Getting everything ready…",
    status: "Just a moment…",
    redirect: "One sec…",
  },
  errors: {
    bootTitle: "Couldn't get started",
    bootBody: "Something interrupted your session. You can try again in a moment.",
    sessionTitle: "You've been away a while",
    sessionBody: "No worries — pick up where you left off or start fresh below.",
    loadTitle: "Couldn't load that",
    loadBody: "Check your connection and try again.",
  },
} as const;

export const GUEST_TRIAL_NAME = {
  title: "What should we call you?",
  description: "First name or nickname — this is what your match will see.",
  fieldPlaceholder: "e.g. Alex",
  saving: "Saving…",
} as const;

export const GUEST_TRIAL_PREFS = {
  title: "What's your vibe?",
  description: "Pick how you're feeling, what you're open to, and a few interests.",
  mood: "How are you feeling?",
  lookingFor: "What kind of chat?",
  interests: "Things you enjoy talking about",
  interestsHint: (count: number, min: number, max: number) =>
    count > 0
      ? `${count} picked — choose ${min} to ${max} things you enjoy.`
      : `Choose ${min} to ${max} things you enjoy talking about.`,
  loading: "Loading ideas…",
  loadError: "Couldn't load options.",
  saveError: "Couldn't save that. Try again?",
  validationMood: "Pick how you're feeling and what kind of chat you want.",
  validationInterests: (min: number) => `Pick at least ${min} things you're into.`,
  saving: "Saving…",
} as const;

export const GUEST_TRIAL_REGISTER = {
  title: "Create free account",
  subtitle: "Want more matches? Sign up and we'll keep your name and picks from today.",
  mergeBanner: (displayName: string | null) =>
    displayName
      ? `We'll carry over ${displayName}'s profile and preferences when you finish signing up.`
      : "We'll carry over your profile and match preferences when you finish signing up.",
  noSessionOnDevice:
    "No try session found on this device. You can still sign up, but your progress may not carry over.",
  wrongEntryWarning:
    "You have a try session on this device. Use the link below so your progress carries over.",
  useGuestSignupLink: "Sign up and keep your progress",
} as const;

export const GUEST_TRIAL_SIGNUP_GATE = {
  title: "Want more matches?",
  subtitle: (displayName: string | null) =>
    displayName
      ? `Hey ${displayName} — create your account and continue.`
      : "Create your account and continue with more matches.",
  deviceUsedTitle: "Your free try is complete",
  deviceUsedSubtitle:
    "This device has already been used for a guest try. Create an account to keep matching — or log in if you're back.",
  mergeHint: "We'll keep your name and picks from today when you sign up on this device.",
  benefits: [
    "Keep matching with people who fit your vibe",
    "Message and call people you connect with",
    "Join live group circles matched to your preferences",
  ],
  primaryCta: "Create free account",
  secondaryCta: "Log in",
  limitTitle: "Want more matches?",
} as const;

export const GUEST_TRIAL_MATCH = {
  matchLabel: "Tap when you're ready",
  cancelSearch: "Stop looking",
  signupCta: "Create free account",
  retriesExhausted: "Create your account and continue with more matches.",
  lastTryHint: "One more try if this match doesn't work out.",
  idle: {
    heading: (displayName: string | null) =>
      displayName ? `Hey ${displayName}, ready to meet someone?` : "Ready to meet someone?",
    subtitle: "Tap the circle below and we'll find someone live to talk with.",
  },
  searching: {
    heading: "Looking for someone…",
    subtitle: "Hang tight — this usually takes just a few seconds.",
  },
  proposed: {
    heading: "Someone's here!",
    subtitle: "Say yes to start your video chat, or skip to meet someone else.",
  },
  matched: {
    heading: "Almost there…",
    subtitle: "Getting your video call ready.",
  },
  connecting: "Connecting you now…",
} as const;
