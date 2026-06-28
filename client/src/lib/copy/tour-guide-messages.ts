/** Product tour copy — short, action-oriented. */

export const TOUR_GUIDE = {
  welcome: {
    nav: {
      title: "Your main navigation",
      description:
        "Home, Explore, Connections, Messages, and Profile. Each tab is one tap away.",
    },
    matchOrb: {
      title: "Find a 1:1 match",
      description:
        "Tap Match to meet someone who fits your goals and mood. Before your first search, we might ask how you're feeling.",
    },
    spaceOrb: {
      title: "Start or join a Space",
      description:
        "Spaces are group video hangouts. Start your own or browse live ones below.",
    },
    preferences: {
      title: "Tune who you meet",
      description:
        "Change match preferences anytime, including mood, goals, and who you want to talk to.",
    },
    spacesGrid: {
      title: "Live spaces",
      description:
        "See what's happening now. Tap a space to join, or browse all spaces for more options.",
    },
    sidebar: {
      title: "Quick glance",
      description:
        "Active spaces, recent matches, and connections, all from Home.",
    },
  },
  settings: {
    replayTitle: "Product tour",
    replayDescription: "Replay the Home walkthrough to see how matching, spaces, and navigation work.",
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
