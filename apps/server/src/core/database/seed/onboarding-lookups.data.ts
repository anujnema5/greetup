export const GOAL_SEED = [
  { name: "make_friends", displayName: "Make friends", description: "Find and connect with new people", emoji: "🤝", isActive: "yes" as const },
  { name: "networking", displayName: "Networking", description: "Expand professional network", emoji: "📊", isActive: "yes" as const },
  { name: "practice_language", displayName: "Practice a language", description: "Improve language skills through conversation", emoji: "🗣️", isActive: "yes" as const },
  { name: "share_ideas", displayName: "Share ideas", description: "Discuss and exchange ideas", emoji: "💡", isActive: "yes" as const },
  { name: "casual_chat", displayName: "Casual chat", description: "Light conversation and company", emoji: "💬", isActive: "yes" as const },
  { name: "collaborate", displayName: "Collaborate", description: "Find co-founders, project partners, or builders", emoji: "🛠️", isActive: "yes" as const },
  { name: "learn_skills", displayName: "Learn skills", description: "Pick up skills through real conversation", emoji: "📚", isActive: "yes" as const },
  { name: "find_mentor", displayName: "Find a mentor", description: "Get guidance from people ahead of you", emoji: "🧭", isActive: "yes" as const },
];

/** Soft-retired: upsert deactivates these so they stop appearing in onboarding. */
export const RETIRED_GOAL_NAMES = ["dating", "join_spaces", "accountability"] as const;

export const INTEREST_SEED = [
  { name: "music", displayName: "Music", category: "arts", emoji: "🎵", isActive: "yes" as const },
  { name: "travel", displayName: "Travel", category: "lifestyle", emoji: "✈️", isActive: "yes" as const },
  { name: "gaming", displayName: "Gaming", category: "entertainment", emoji: "🎮", isActive: "yes" as const },
  { name: "reading", displayName: "Reading", category: "arts", emoji: "📖", isActive: "yes" as const },
  { name: "fitness", displayName: "Fitness", category: "lifestyle", emoji: "💪", isActive: "yes" as const },
  { name: "photography", displayName: "Photography", category: "arts", emoji: "📷", isActive: "yes" as const },
  { name: "technology", displayName: "Technology", category: "career", emoji: "💻", isActive: "yes" as const },
  { name: "movies", displayName: "Movies", category: "entertainment", emoji: "🎬", isActive: "yes" as const },
  { name: "sports", displayName: "Sports", category: "lifestyle", emoji: "⚽", isActive: "yes" as const },
  { name: "art", displayName: "Art", category: "arts", emoji: "🎨", isActive: "yes" as const },
  { name: "startups", displayName: "Startups", category: "career", emoji: "🚀", isActive: "yes" as const },
  { name: "ai", displayName: "AI", category: "career", emoji: "🤖", isActive: "yes" as const },
  { name: "design", displayName: "Design", category: "arts", emoji: "✨", isActive: "yes" as const },
  { name: "anime", displayName: "Anime", category: "entertainment", emoji: "🎌", isActive: "yes" as const },
  { name: "languages", displayName: "Languages", category: "learning", emoji: "🌍", isActive: "yes" as const },
  { name: "career_growth", displayName: "Career growth", category: "career", emoji: "📈", isActive: "yes" as const },
  { name: "philosophy", displayName: "Philosophy", category: "learning", emoji: "🧠", isActive: "yes" as const },
  { name: "podcasts", displayName: "Podcasts", category: "entertainment", emoji: "🎧", isActive: "yes" as const },
  { name: "wellness", displayName: "Wellness", category: "lifestyle", emoji: "🌿", isActive: "yes" as const },
  { name: "writing", displayName: "Writing", category: "arts", emoji: "✍️", isActive: "yes" as const },
  { name: "science", displayName: "Science", category: "learning", emoji: "🔬", isActive: "yes" as const },
];

/** Soft-retired interests — deactivated on seed without deleting user relations. */
export const RETIRED_INTEREST_NAMES = ["cooking", "productivity", "remote_work"] as const;

export const PROFESSION_SEED = [
  { name: "student", displayName: "Student", category: "education", isActive: "yes" as const },
  { name: "software_engineer", displayName: "Software engineer", category: "technology", isActive: "yes" as const },
  { name: "product_manager", displayName: "Product manager", category: "technology", isActive: "yes" as const },
  { name: "data_scientist", displayName: "Data scientist", category: "technology", isActive: "yes" as const },
  { name: "designer", displayName: "Designer", category: "creative", isActive: "yes" as const },
  { name: "entrepreneur", displayName: "Entrepreneur", category: "business", isActive: "yes" as const },
  { name: "marketing", displayName: "Marketer", category: "business", isActive: "yes" as const },
  { name: "sales", displayName: "Sales", category: "business", isActive: "yes" as const },
  { name: "consultant", displayName: "Consultant", category: "business", isActive: "yes" as const },
  { name: "freelancer", displayName: "Freelancer", category: "business", isActive: "yes" as const },
  { name: "writer", displayName: "Writer", category: "creative", isActive: "yes" as const },
  { name: "content_creator", displayName: "Content creator", category: "creative", isActive: "yes" as const },
  { name: "artist", displayName: "Artist", category: "creative", isActive: "yes" as const },
  { name: "teacher", displayName: "Teacher", category: "education", isActive: "yes" as const },
  { name: "researcher", displayName: "Researcher", category: "academia", isActive: "yes" as const },
  { name: "doctor", displayName: "Doctor", category: "healthcare", isActive: "yes" as const },
  { name: "nurse", displayName: "Nurse", category: "healthcare", isActive: "yes" as const },
  { name: "finance", displayName: "Finance", category: "business", isActive: "yes" as const },
  { name: "lawyer", displayName: "Lawyer", category: "business", isActive: "yes" as const },
  { name: "hr", displayName: "HR", category: "business", isActive: "yes" as const },
  { name: "engineer", displayName: "Engineer", category: "technology", isActive: "yes" as const },
  { name: "other", displayName: "Other", category: "other", isActive: "yes" as const },
];

export const MOOD_SEED = [
  { name: "chill", displayName: "Chill", description: "Relaxed and easy-going" },
  { name: "energetic", displayName: "Energetic", description: "Full of energy and enthusiasm" },
  { name: "curious", displayName: "Curious", description: "Want to learn and explore" },
  { name: "creative", displayName: "Creative", description: "In a creative mindset" },
  { name: "thoughtful", displayName: "Thoughtful", description: "Deep in thought" },
  { name: "playful", displayName: "Playful", description: "Fun and lighthearted" },
  { name: "focused", displayName: "Focused", description: "Ready to concentrate" },
  { name: "open", displayName: "Open", description: "Open to anything" },
  { name: "tired", displayName: "Tired", description: "Low energy, winding down" },
  { name: "inspired", displayName: "Inspired", description: "Feeling inspired" },
];

export const LOOKING_FOR_OPTION_SEED = [
  { name: "deep_talk", displayName: "Deep talk", description: "Meaningful, in-depth conversation" },
  { name: "light_chat", displayName: "Light chat", description: "Casual, easy conversation" },
  { name: "advice", displayName: "Advice", description: "Looking for or giving advice" },
  { name: "venting", displayName: "Venting", description: "Need to vent or listen" },
  { name: "brainstorm", displayName: "Brainstorm", description: "Ideas and brainstorming" },
  { name: "practice", displayName: "Practice", description: "Practice (language, pitch, etc.)" },
  { name: "fun", displayName: "Fun", description: "Just for fun" },
  { name: "support", displayName: "Support", description: "Emotional support" },
  { name: "debate", displayName: "Debate", description: "Friendly debate or discussion" },
  { name: "networking", displayName: "Networking", description: "Professional networking" },
  { name: "collaboration", displayName: "Collaboration", description: "Build or ship something together" },
  { name: "mentorship", displayName: "Mentorship", description: "Give or receive guidance" },
  { name: "hangout", displayName: "Hangout", description: "Casual company in a live space" },
];
