export const CIRCLES = [
  { id: 1, topic: "Tech & Startups", host: "Arjun S.", count: 24, cover: "from-violet-600/80 via-violet-700/60 to-purple-900" },
  { id: 2, topic: "Late Night Vibes", host: "Maya R.", count: 12, cover: "from-pink-600/80 via-rose-700/60 to-pink-900" },
  { id: 3, topic: "Creative Minds", host: "Dev P.", count: 38, cover: "from-sky-500/80 via-blue-700/60 to-indigo-900" },
  { id: 4, topic: "Founders Corner", host: "Sara L.", count: 9, cover: "from-amber-500/80 via-orange-600/60 to-orange-900" },
  { id: 5, topic: "Mindfulness", host: "Riya M.", count: 17, cover: "from-emerald-500/80 via-teal-700/60 to-teal-900" },
] as const;

export const CONNECTIONS = [
  { id: 1, name: "Alex M.", sub: "Tech & Music", mutual: 4, online: true, initials: "AM", grad: "from-violet-400 to-violet-600" },
  { id: 2, name: "Priya K.", sub: "Design & Travel", mutual: 6, online: false, initials: "PK", grad: "from-pink-400 to-rose-600" },
  { id: 3, name: "Jordan L.", sub: "Fitness & Tech", mutual: 3, online: true, initials: "JL", grad: "from-sky-400 to-blue-600" },
] as const;

export const TRENDING_TAGS = ["ai & ml", "startups", "indie music", "design", "travel", "fitness"] as const;
