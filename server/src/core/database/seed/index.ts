import "@/shared/config/load-env";
import { db } from "@/core/database";
import {
  goals,
  profileGoals,
  interests,
  profileInterests,
  professions,
  profileProfessions,
  moods,
  lookingForOptions,
  currentStatusMoods,
  currentStatusLookingFor,
} from "@/core/database/schema";
import { upsertRoomCategories } from "./upsert-room-categories";

async function seed() {
  console.log("🌱 Seeding database...");

  // ─── 1. Clear dependent (junction) tables first (foreign keys reference lookup tables) ───
  console.log("Clearing dependent tables...");
  await db.delete(profileGoals);
  await db.delete(profileInterests);
  await db.delete(profileProfessions);
  await db.delete(currentStatusMoods);
  await db.delete(currentStatusLookingFor);

  // ─── 2. Clear lookup tables ───
  console.log("Clearing lookup tables...");
  await db.delete(goals);
  await db.delete(interests);
  await db.delete(professions);
  await db.delete(moods);
  await db.delete(lookingForOptions);

  // ─── 3. Fresh insert lookup data ───

  // Goals (emoji served from backend; no static images on frontend)
  await db.insert(goals).values([
    { name: "make_friends", displayName: "Make friends", description: "Find and connect with new people", emoji: "🤝", isActive: "yes" },
    { name: "networking", displayName: "Networking", description: "Expand professional network", emoji: "📊", isActive: "yes" },
    { name: "dating", displayName: "Dating", description: "Find romantic connections", emoji: "❤️", isActive: "yes" },
    { name: "practice_language", displayName: "Practice a language", description: "Improve language skills through conversation", emoji: "🗣️", isActive: "yes" },
    { name: "share_ideas", displayName: "Share ideas", description: "Discuss and exchange ideas", emoji: "💡", isActive: "yes" },
    { name: "casual_chat", displayName: "Casual chat", description: "Light conversation and company", emoji: "💬", isActive: "yes" },
  ]);

  // Interests (with categories; emoji from backend for profile-setup cards)
  await db.insert(interests).values([
    { name: "music", displayName: "Music", category: "arts", emoji: "🎵", isActive: "yes" },
    { name: "travel", displayName: "Travel", category: "lifestyle", emoji: "✈️", isActive: "yes" },
    { name: "gaming", displayName: "Gaming", category: "entertainment", emoji: "🎮", isActive: "yes" },
    { name: "reading", displayName: "Reading", category: "arts", emoji: "📖", isActive: "yes" },
    { name: "fitness", displayName: "Fitness", category: "lifestyle", emoji: "💪", isActive: "yes" },
    { name: "cooking", displayName: "Cooking", category: "lifestyle", emoji: "🍳", isActive: "yes" },
    { name: "photography", displayName: "Photography", category: "arts", emoji: "📷", isActive: "yes" },
    { name: "technology", displayName: "Technology", category: "career", emoji: "💻", isActive: "yes" },
    { name: "movies", displayName: "Movies", category: "entertainment", emoji: "🎬", isActive: "yes" },
    { name: "sports", displayName: "Sports", category: "lifestyle", emoji: "⚽", isActive: "yes" },
    { name: "art", displayName: "Art", category: "arts", emoji: "🎨", isActive: "yes" },
    { name: "startups", displayName: "Startups", category: "career", emoji: "🚀", isActive: "yes" },
  ]);

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
  ]);

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
  ]);

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
  ]);

  await upsertRoomCategories();

  console.log(
    "✅ Seed completed: goals, interests, professions, moods, lookingForOptions, roomCategories",
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
