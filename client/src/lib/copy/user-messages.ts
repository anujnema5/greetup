/** Shared product copy — plain language, user-first. */

export const DASHBOARD_GREETING_SUBTITLE =
  "Match with someone new, message friends, or join a live circle." as const;

export const DASHBOARD_HERO = {
  onlineBadge: (count: number) =>
    count === 1 ? "1 person online now" : `${count.toLocaleString()} people online now`,
  matchLabel: "Match",
  circleLabel: "Circle",
  cancelSearch: "Cancel search",
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
      "Tap Connect if you are interested. Both people need to connect before you can chat.",
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
  dialogDescription: "Everyone you've matched with on Find Match, newest first — connected or not.",
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
    modalSubtitle: "Live now and scheduled — tap Join to enter the room or lobby",
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
      "Based on your interests — people with a similar vibe you can connect with.",
    subtitleNoInterests:
      "Add interests on your profile to see people in your niche.",
    emptyNoMatches: "No one in your niche yet. Try adding more interests to your profile.",
    editProfile: "Edit profile",
    endOfList: "That's everyone in your niche for now.",
    loading: "Finding people in your niche…",
    error: "Could not load suggestions. Try again in a moment.",
  },
} as const;
