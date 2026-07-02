/** Product tour copy — short, action-oriented. */

export const TOUR_GUIDE = {
  welcome: {
    nav: {
      title: "Your main navigation",
      description:
        "Home, Explore, Connections, Messages, and Profile. Each tab is one tap away.",
    },
    matchOrb: {
      title: "Quick match",
      description:
        "Tap Quick match for a 1:1 based on your vibe and mood. We may ask how you're feeling before your first search.",
    },
    activityMatch: {
      title: "Match by activity",
      description:
        "Choose something specific like chess, language practice, or a yap session. Activity is required before we search.",
    },
    openToConnect: {
      title: "Let people find you",
      description:
        "Go open to stay discoverable while you're online, even when you're not searching. People can send you a connect request.",
    },
    spaceOrb: {
      title: "Start a space",
      description:
        "Host a small group video hangout. Browse live spaces below to join one instead.",
    },
    preferences: {
      title: "Tune who you meet",
      description:
        "Change match preferences anytime: mood, activities, who you want to talk to, and more.",
    },
    spacesGrid: {
      title: "Live spaces",
      description:
        "See what's happening now. Tap a space to join, or browse all spaces for more options.",
    },
    sidebar: {
      title: "Quick glance",
      description:
        "Connect requests, people open now, active spaces, and recent matches, all from Home.",
    },
  },
  settings: {
    replayTitle: "Product tour",
    replayDescription:
      "Replay the Home walkthrough to see matching, Open now, spaces, and navigation.",
    replayButton: "Replay tour",
    replayPending: "Opening Home…",
  },
  controls: {
    next: "Next",
    back: "Back",
    done: "Got it",
    skip: "Skip tour",
  },
} as const;
