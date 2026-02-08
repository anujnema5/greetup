import "dotenv/config";
import { db } from "@/core/database";
import { goals } from "@/core/database/schema/goals";
import { interests } from "@/core/database/schema/interests";
import { professions } from "@/core/database/schema/professions";
import { moods, lookingForOptions } from "@/core/database/schema/current-status";
import { connectionTypes } from "@/core/database/schema/preferences";

async function seed() {
  console.log("🌱 Seeding database...");

  // Goals
  await db.insert(goals).values([
    { name: "make_friends", displayName: "Make friends", description: "Find and connect with new people", isActive: "yes" },
    { name: "networking", displayName: "Networking", description: "Expand professional network", isActive: "yes" },
    { name: "dating", displayName: "Dating", description: "Find romantic connections", isActive: "yes" },
    { name: "practice_language", displayName: "Practice a language", description: "Improve language skills through conversation", isActive: "yes" },
    { name: "share_ideas", displayName: "Share ideas", description: "Discuss and exchange ideas", isActive: "yes" },
    { name: "casual_chat", displayName: "Casual chat", description: "Light conversation and company", isActive: "yes" },
  ]).onConflictDoNothing({ target: goals.name });

  // Interests (with categories)
  await db.insert(interests).values([
    { name: "music", displayName: "Music", category: "arts", isActive: "yes" },
    { name: "travel", displayName: "Travel", category: "lifestyle", isActive: "yes" },
    { name: "gaming", displayName: "Gaming", category: "entertainment", isActive: "yes" },
    { name: "reading", displayName: "Reading", category: "arts", isActive: "yes" },
    { name: "fitness", displayName: "Fitness", category: "lifestyle", isActive: "yes" },
    { name: "cooking", displayName: "Cooking", category: "lifestyle", isActive: "yes" },
    { name: "photography", displayName: "Photography", category: "arts", isActive: "yes" },
    { name: "technology", displayName: "Technology", category: "career", isActive: "yes" },
    { name: "movies", displayName: "Movies", category: "entertainment", isActive: "yes" },
    { name: "sports", displayName: "Sports", category: "lifestyle", isActive: "yes" },
    { name: "art", displayName: "Art", category: "arts", isActive: "yes" },
    { name: "startups", displayName: "Startups", category: "career", isActive: "yes" },
  ]).onConflictDoNothing();

  // Professions (with categories and displayName)
  await db.insert(professions).values([
    { name: "software_engineer", displayName: "Software Engineer", category: "technology", isActive: "yes" },
    { name: "designer", displayName: "Designer", category: "creative", isActive: "yes" },
    { name: "teacher", displayName: "Teacher", category: "education", isActive: "yes" },
    { name: "doctor", displayName: "Doctor", category: "healthcare", isActive: "yes" },
    { name: "entrepreneur", displayName: "Entrepreneur", category: "business", isActive: "yes" },
    { name: "student", displayName: "Student", category: "education", isActive: "yes" },
    { name: "marketing", displayName: "Marketing", category: "business", isActive: "yes" },
    { name: "writer", displayName: "Writer", category: "creative", isActive: "yes" },
    { name: "nurse", displayName: "Nurse", category: "healthcare", isActive: "yes" },
    { name: "consultant", displayName: "Consultant", category: "business", isActive: "yes" },
    { name: "artist", displayName: "Artist", category: "creative", isActive: "yes" },
    { name: "researcher", displayName: "Researcher", category: "academia", isActive: "yes" },
  ]).onConflictDoNothing();

  // Moods
  await db.insert(moods).values([
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
  ]).onConflictDoNothing({ target: moods.name });

  // Looking for options (what user is looking for in a session)
  await db.insert(lookingForOptions).values([
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
  ]).onConflictDoNothing({ target: lookingForOptions.name });

  // Connection types (preference lookup)
  await db.insert(connectionTypes).values([
    { name: "voice", displayName: "Voice call", description: "Prefer voice conversation", isActive: "yes" },
    { name: "video", displayName: "Video call", description: "Prefer video conversation", isActive: "yes" },
    { name: "text", displayName: "Text chat", description: "Prefer text-based chat", isActive: "yes" },
    { name: "any", displayName: "Any", description: "Flexible with connection type", isActive: "yes" },
  ]).onConflictDoNothing({ target: connectionTypes.name });

  console.log("✅ Seed completed: goals, interests, professions, moods, lookingForOptions, connectionTypes");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
